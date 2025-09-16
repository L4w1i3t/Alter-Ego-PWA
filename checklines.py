# python script that views each file in a codebase and outputs the total amount of lines both in each file and in the entire codebase. ignores library files and binaries.

import os
import fnmatch
import argparse
from collections import defaultdict
import logging
import time
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
start_time = time.time()
total_lines = 0
file_line_counts = defaultdict(int)
ignored_dirs = {'node_modules', 'venv', '__pycache__', '.git', 'build', 'dist'}
ignored_file_patterns = ['*.min.js', '*.pyc', '*.exe', '*.dll', '*.so', '*.bin']

def is_ignored_file(filename):
    return any(fnmatch.fnmatch(filename, pattern) for pattern in ignored_file_patterns)

def count_lines_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for line in f)
    except Exception as e:
        logger.error(f"Error reading {filepath}: {e}")
        return 0
def should_ignore_dir(dirpath):
    return any(ignored in dirpath for ignored in ignored_dirs)
def scan_directory(directory):
    global total_lines
    for root, dirs, files in os.walk(directory):
        if should_ignore_dir(root):
            continue
        for file in files:
            if is_ignored_file(file):
                continue
            filepath = os.path.join(root, file)
            line_count = count_lines_in_file(filepath)
            if line_count > 0:
                file_line_counts[filepath] = line_count
                total_lines += line_count
                logger.info(f"{filepath}: {line_count} lines")
                print(f"{filepath}: {line_count} lines")
                sys.stdout.flush()
def main():
    parser = argparse.ArgumentParser(description='Count lines of code in a directory, ignoring certain files and directories.')
    parser.add_argument('directory', type=str, help='The root directory to scan')
    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        logger.error(f"The provided path '{args.directory}' is not a valid directory.")
        return

    scan_directory(args.directory)

    logger.info(f"Total lines of code: {total_lines}")
    print(f"Total lines of code: {total_lines}")
    elapsed_time = time.time() - start_time
    logger.info(f"Time taken: {elapsed_time:.2f} seconds")
    print(f"Time taken: {elapsed_time:.2f} seconds")
    sys.stdout.flush()
if __name__ == '__main__':
    main()