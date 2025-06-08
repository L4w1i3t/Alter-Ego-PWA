# AlterEgo PWA Backend

This is the backend server for the AlterEgo PWA that provides open-source language model capabilities.

## Features

- **Open-Source Language Models**: Supports multiple models including DialoGPT, BlenderBot, and others
- **OpenAI-Compatible API**: Uses the same API format as OpenAI for seamless integration
- **GPU Acceleration**: Automatic GPU detection and utilization (CUDA, MPS for Apple Silicon)
- **Model Management**: Load/unload models dynamically to manage memory
- **Quantization Support**: 8-bit quantization for larger models to reduce memory usage
- **CORS Enabled**: Ready for frontend integration

## Supported Models

- **DialoGPT Small/Medium/Large**: Microsoft's conversational AI models
- **BlenderBot 400M**: Facebook's conversational AI optimized for engaging dialogue
- **Extensible**: Easy to add more Hugging Face models

## Installation

1. **Create a Python virtual environment:**
   ```bash
   python -m venv alterego-backend
   ```

2. **Activate the virtual environment:**
   ```bash
   # Windows
   alterego-backend\Scripts\activate
   
   # macOS/Linux
   source alterego-backend/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Starting the Server

```bash
python main.py
```

The server will start on `http://127.0.0.1:8000` by default.

### Environment Variables

- `HOST`: Server host (default: 127.0.0.1)
- `PORT`: Server port (default: 8000)

Example:
```bash
HOST=0.0.0.0 PORT=3000 python main.py
```

### API Endpoints

#### Health Check
```
GET /
GET /health
```

#### List Available Models
```
GET /models
```

#### Chat Completions (OpenAI Compatible)
```
POST /chat/completions
```

Example request:
```json
{
  "model": "microsoft/DialoGPT-medium",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

#### Model Management
```
POST /models/{model_name}/load    # Load a model
DELETE /models/{model_name}/unload # Unload a model
```

## Hardware Requirements

### Minimum Requirements
- **CPU**: Multi-core processor (4+ cores recommended)
- **RAM**: 8GB+ (16GB+ recommended for larger models)
- **Storage**: 5GB+ free space for model downloads

### Recommended Requirements
- **GPU**: NVIDIA GPU with 6GB+ VRAM (for CUDA acceleration)
- **RAM**: 16GB+ system memory
- **Storage**: SSD with 10GB+ free space

### Apple Silicon (M1/M2/M3)
- Supports MPS (Metal Performance Shaders) acceleration
- 16GB unified memory recommended for optimal performance

## Performance Optimization

### Model Selection by Hardware

**Low-end systems (8GB RAM, no GPU):**
- `microsoft/DialoGPT-small`

**Mid-range systems (16GB RAM, basic GPU):**
- `microsoft/DialoGPT-medium`
- `facebook/blenderbot-400M-distill`

**High-end systems (32GB+ RAM, powerful GPU):**
- `microsoft/DialoGPT-large`
- Can run multiple models simultaneously

### Memory Management

The server automatically:
- Detects available hardware (CPU/CUDA/MPS)
- Applies quantization for large models on GPU
- Manages model loading/unloading to optimize memory usage

## Troubleshooting

### Common Issues

**1. CUDA Out of Memory**
```
Solution: Use smaller models or enable model unloading between conversations
```

**2. Model Download Fails**
```
Solution: Check internet connection and Hugging Face Hub status
```

**3. Slow Inference on CPU**
```
Solution: Consider using smaller models or upgrading to GPU acceleration
```

### Logs

The server provides detailed logging for debugging:
- Model loading status
- Device information
- Generation performance metrics
- Error details

## Integration with AlterEgo PWA

The backend is designed to integrate seamlessly with the AlterEgo PWA frontend. The frontend should be updated to:

1. **Configure Backend URL**: Point to this server's address
2. **Update Model Selection**: Use the `/models` endpoint to populate available models
3. **API Compatibility**: The `/chat/completions` endpoint matches OpenAI's format

## Security Considerations

- **CORS**: Currently allows all origins for development. Restrict in production.
- **Rate Limiting**: Consider adding rate limiting for production deployment
- **Authentication**: Add authentication if deploying publicly

## Future Enhancements

- **Streaming Responses**: Real-time response streaming
- **Custom Model Support**: Easy integration of custom fine-tuned models
- **Batch Processing**: Support for multiple simultaneous requests
- **Model Caching**: Intelligent model caching strategies
- **Monitoring**: Built-in performance and health monitoring
