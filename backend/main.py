"""
AlterEgo PWA Backend Server
A FastAPI server that provides open-source language model capabilities for the AlterEgo PWA.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import logging
import os
import time
from datetime import datetime
import uvicorn
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    TextStreamer
)
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AlterEgo PWA Backend",
    description="Open-source language model backend for AlterEgo PWA",
    version="1.0.0"
)

# Configure CORS to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class Message(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "Orenguteng/Llama-3-8B-Lexi-Uncensored"  # Default model
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]

class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    parameters: Optional[str] = None
    context_length: Optional[int] = None
    loaded: bool = False

# Global model storage
loaded_models = {}
available_models = {

    "Orenguteng/Llama-3-8B-Lexi-Uncensored": {
        "name": "Llama 3.1 8B Lexi Uncensored",
        "description": "Meta's powerful 8B parameter language model with improved reasoning and capabilities",
        "parameters": "8B",
        "context_length": 8192
    }
}

def get_device():
    """Determine the best available device for model inference."""
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return "mps"  # Apple Silicon
    else:
        return "cpu"

async def load_model(model_name: str):
    """Load a model and tokenizer."""
    if model_name in loaded_models:
        return loaded_models[model_name]
    try:
        logger.info(f"Loading model: {model_name}")
        device = get_device()
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_name, padding_side='left')
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Load model with simplified configuration
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if device in ["cuda", "mps"] else torch.float32,
            low_cpu_mem_usage=True
        )
        
        # Move model to device
        model = model.to(device)
        
        loaded_models[model_name] = {
            "model": model,
            "tokenizer": tokenizer,
            "device": device
        }
        
        logger.info(f"Successfully loaded {model_name} on {device}")
        return loaded_models[model_name]
        
    except Exception as e:
        logger.error(f"Error loading model {model_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load model {model_name}: {str(e)}")

def format_chat_prompt(messages: List[Message], model_name: str) -> str:
    """Format messages for the specific model type."""
    
    # For Llama models, use the proper chat format
    if "llama" in model_name.lower():
        conversation = ""
        
        for message in messages:
            if message.role == "system":
                conversation += f"<|start_header_id|>system<|end_header_id|>\n{message.content}<|eot_id|>\n"
            elif message.role == "user":
                conversation += f"<|start_header_id|>user<|end_header_id|>\n{message.content}<|eot_id|>\n"
            elif message.role == "assistant":
                conversation += f"<|start_header_id|>assistant<|end_header_id|>\n{message.content}<|eot_id|>\n"
        
        # Add the assistant prompt for generation
        conversation += "<|start_header_id|>assistant<|end_header_id|>\n"
        return conversation
    
    # For TinyLlama, use a simpler format
    elif "tinyllama" in model_name.lower():
        conversation = ""
        for message in messages:
            if message.role == "system":
                conversation += f"<|system|>\n{message.content}</s>\n"
            elif message.role == "user":
                conversation += f"<|user|>\n{message.content}</s>\n"
            elif message.role == "assistant":
                conversation += f"<|assistant|>\n{message.content}</s>\n"
        
        conversation += "<|assistant|>\n"
        return conversation
    
    # For DialoGPT models, we need to format as conversation
    elif "DialoGPT" in model_name:
        conversation = ""
        
        # Handle system message as context
        system_context = ""
        for message in messages:
            if message.role == "system":
                system_context = message.content + " "
                break
        
        # Build conversation history
        chat_history = []
        for message in messages:
            if message.role == "user":
                chat_history.append(message.content)
            elif message.role == "assistant":
                chat_history.append(message.content)
        
        # For DialoGPT, we want to format as: context + last few exchanges + current input
        if chat_history:
            # Take last user message as the current input
            current_input = chat_history[-1] if chat_history else ""
            
            # Build the prompt: context + current input
            conversation = system_context + current_input
        else:
            conversation = system_context
        
        return conversation
    
    # For other models, use a simpler format
    else:
        conversation = ""
        for message in messages:
            if message.role == "system":
                conversation += f"System: {message.content}\n"
            elif message.role == "user":
                conversation += f"Human: {message.content}\n"
            elif message.role == "assistant":
                conversation += f"Assistant: {message.content}\n"
        
        conversation += "Assistant:"
        return conversation

async def generate_response(prompt: str, model_data: dict, temperature: float, max_tokens: int) -> str:
    """Generate a response using the loaded model."""
    try:
        if model_data is None:
            raise HTTPException(status_code=500, detail="Model data is None - model failed to load")
            
        model = model_data["model"]
        tokenizer = model_data["tokenizer"]
        device = model_data["device"]
        
        logger.info(f"Generating response for prompt: {prompt[:100]}...")
        
        # Tokenize input
        inputs = tokenizer.encode(prompt, return_tensors="pt").to(device)
        
        # Ensure we don't exceed model's context length
        max_length = min(inputs.shape[1] + max_tokens, model.config.max_position_embeddings or 1024)
        
        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                inputs,
                max_length=max_length,
                num_return_sequences=1,
                temperature=temperature,
                do_sample=temperature > 0,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                no_repeat_ngram_size=2,
                repetition_penalty=1.1,
                early_stopping=True
            )
        
        # Decode the response
        full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        logger.info(f"Full model output: {full_response}")
          # Extract only the new generated part
        response = full_response[len(prompt):].strip()
        
        logger.info(f"Extracted response: {response}")
        
        # Clean up the response based on model type
        if "<|eot_id|>" in response:
            response = response.split("<|eot_id|>")[0].strip()
        elif "<|endoftext|>" in response:
            response = response.split("<|endoftext|>")[0].strip()
        elif "</s>" in response:
            response = response.split("</s>")[0].strip()
        
        # For conversational models, try to extract just the assistant's response
        if "<|start_header_id|>user<|end_header_id|>" in response:
            response = response.split("<|start_header_id|>user<|end_header_id|>")[0].strip()
        elif "Human:" in response:
            response = response.split("Human:")[0].strip()
        elif "<|user|>" in response:
            response = response.split("<|user|>")[0].strip()
        
        # Remove any unwanted prefixes or suffixes
        response = response.strip()
        
        # If still empty, provide a basic fallback
        if not response:
            logger.warning("Generated response was empty, using fallback")
            response = "Hello! My normal response failed, so this is a fallback response. How can I assist you?"
        
        logger.info(f"Final response: {response}")
        return response
        
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "message": "AlterEgo PWA Backend Server",
        "version": "1.0.0",
        "device": get_device(),
        "loaded_models": list(loaded_models.keys())
    }

@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List all available models."""
    models = []
    for model_id, info in available_models.items():
        models.append(ModelInfo(
            id=model_id,
            name=info["name"],
            description=info["description"],
            parameters=info.get("parameters"),
            context_length=info.get("context_length"),
            loaded=model_id in loaded_models
        ))
    return models

@app.post("/chat/completions", response_model=ChatResponse)
async def create_chat_completion(request: ChatRequest):
    """Create a chat completion using open-source models."""
    
    # Validate model
    if request.model not in available_models:
        raise HTTPException(status_code=400, detail=f"Model {request.model} not available")
    
    # Load model if not already loaded
    model_data = await load_model(request.model)
    
    # Format the conversation for the model
    prompt = format_chat_prompt(request.messages, request.model)
    
    # Generate response
    response_content = await generate_response(
        prompt, 
        model_data, 
        request.temperature, 
        request.max_tokens
    )
    
    # Create response in OpenAI format for compatibility
    response = ChatResponse(
        id=f"chatcmpl-{int(time.time())}",
        created=int(time.time()),
        model=request.model,
        choices=[{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_content
            },
            "finish_reason": "stop"
        }],
        usage={
            "prompt_tokens": len(prompt.split()),  # Rough estimate
            "completion_tokens": len(response_content.split()),
            "total_tokens": len(prompt.split()) + len(response_content.split())
        }
    )
    
    return response

@app.post("/models/{model_name}/load")
async def load_specific_model(model_name: str, background_tasks: BackgroundTasks):
    """Load a specific model in the background."""
    if model_name not in available_models:
        raise HTTPException(status_code=400, detail=f"Model {model_name} not available")
    
    if model_name in loaded_models:
        return {"status": "already_loaded", "model": model_name}
    
    # Load in background
    background_tasks.add_task(load_model, model_name)
    
    return {"status": "loading", "model": model_name}

@app.delete("/models/{model_name}/unload")
async def unload_model(model_name: str):
    """Unload a specific model to free memory."""
    if model_name not in loaded_models:
        raise HTTPException(status_code=400, detail=f"Model {model_name} not loaded")
    
    try:
        # Clean up GPU memory
        if loaded_models[model_name]["device"] == "cuda":
            torch.cuda.empty_cache()
        
        del loaded_models[model_name]
        
        return {"status": "unloaded", "model": model_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unload model: {str(e)}")

@app.get("/health")
async def health_check():
    """Detailed health check with system information."""
    device = get_device()
    
    health_info = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "device": device,
        "loaded_models": len(loaded_models),
        "available_models": len(available_models),
        "memory": {}
    }
    
    # Add GPU memory info if available
    if device == "cuda":
        health_info["memory"]["gpu_allocated"] = f"{torch.cuda.memory_allocated() / 1e9:.2f} GB"
        health_info["memory"]["gpu_reserved"] = f"{torch.cuda.memory_reserved() / 1e9:.2f} GB"
    
    return health_info

if __name__ == "__main__":
    # Configuration
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    
    logger.info(f"Starting AlterEgo PWA Backend on {host}:{port}")
    logger.info(f"Device: {get_device()}")
    logger.info(f"Available models: {list(available_models.keys())}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Disable in production
        log_level="info"
    )
