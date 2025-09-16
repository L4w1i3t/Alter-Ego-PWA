# python script to remove ALL instances of emojis in code files in the current directory as well as all child directories
import os
import re


def remove_emojis_from_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as file:
            content = file.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return
    # Expanded regex pattern to match more emojis and symbols
    emoji_pattern = re.compile(
        r"["
        r"\U0001F600-\U0001F64F"  # emoticons
        r"\U0001F300-\U0001F5FF"  # symbols & pictographs
        r"\U0001F680-\U0001F6FF"  # transport & map symbols
        r"\U0001F700-\U0001F77F"  # alchemical symbols
        r"\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
        r"\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
        r"\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
        r"\U0001FA00-\U0001FA6F"  # Chess Symbols
        r"\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
        r"\U00002700-\U000027BF"  # Dingbats
        r"\U000024C2-\U0001F251"  # Enclosed characters
        r"\U0001F1E6-\U0001F1FF"  # Flags
        r"\U0000200D"  # Zero Width Joiner
        r"\U00002300-\U000023FF"  # Misc technical
        r"\U000025A0-\U000025FF"  # Geometric shapes
        r"\U00002100-\U000021FF"  # Letterlike symbols
        r"\U0001F004"  # Mahjong tile red dragon
        r"\U0001F0CF"  # Playing card black joker
        r"\U0001F18E"  # Negative squared AB
        r"\U0001F191-\U0001F19A"  # Squared CL, COOL, FREE, etc.
        r"\U0001F1E6-\U0001F1FF"  # Regional indicator symbols
        r"\U0001F201-\U0001F2FF"  # Enclosed ideographic supplement
        r"\U0001F232-\U0001F23A"  # Squared CJK Unified Ideographs
        r"\U0001F250-\U0001F251"  # Circled ideograph advantage, accept
        r"]",
        flags=re.UNICODE,
    )
    # Find all emojis in the content
    emojis_found = emoji_pattern.findall(content)
    if emojis_found:
        print(f"Removing from {file_path}:")
        for emoji in emojis_found:
            print(f"  {repr(emoji)}")
    # Remove emojis from the content
    cleaned_content = emoji_pattern.sub(r"", content)
    try:
        with open(file_path, "w", encoding="utf-8", errors="replace") as file:
            file.write(cleaned_content)
    except Exception as e:
        print(f"Error writing {file_path}: {e}")


def remove_emojis_from_directory(directory):
    # List of common code file extensions
    code_extensions = [
        ".py",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".c",
        ".cpp",
        ".h",
        ".hpp",
        ".java",
        ".cs",
        ".rb",
        ".go",
        ".php",
        ".swift",
        ".kt",
        ".scala",
        ".rs",
        ".m",
        ".mm",
        ".sh",
        ".pl",
        ".lua",
        ".dart",
        ".html",
        ".css",
        ".json",
        ".xml",
        ".yml",
        ".yaml",
        ".sql",
        ".r",
        ".vb",
        ".fs",
        ".erl",
        ".ex",
        ".exs",
        ".groovy",
        ".ps1",
        ".bat",
        ".cmd",
        ".asm",
        ".s",
        ".v",
        ".sv",
        ".vhd",
        ".vhdl",
        ".ini",
        ".cfg",
        ".conf",
        ".toml",
        ".md",
        ".txt",
    ]
    # List of subdirectories to ignore
    ignore_dirs = ["node_modules", ".git", "__pycache__"]
    for root, dirs, files in os.walk(directory):
        # Remove ignored directories from traversal
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if any(file.endswith(ext) for ext in code_extensions):
                file_path = os.path.join(root, file)
                remove_emojis_from_file(file_path)


if __name__ == "__main__":
    current_directory = os.getcwd()
    remove_emojis_from_directory(current_directory)
    print(
        "Emojis removed from all code files in the current directory and its subdirectories."
    )
