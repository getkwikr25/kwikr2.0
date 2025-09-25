#!/usr/bin/env python3
"""
Import the complete Kwikr dataset in manageable chunks to avoid timeout issues.
"""

import subprocess
import time
import os

def run_import_chunk(chunk_file, chunk_number, total_chunks):
    """
    Import a single chunk file and report progress.
    """
    print(f"Importing chunk {chunk_number}/{total_chunks}: {chunk_file}")
    
    cmd = ["npx", "wrangler", "d1", "execute", "kwikr-directory-production", "--local", f"--file={chunk_file}"]
    
    try:
        result = subprocess.run(cmd, cwd="/home/user/webapp", capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print(f"✅ Chunk {chunk_number} imported successfully")
            return True
        else:
            print(f"❌ Chunk {chunk_number} failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"⏰ Chunk {chunk_number} timed out")
        return False
    except Exception as e:
        print(f"💥 Chunk {chunk_number} error: {e}")
        return False

def create_import_chunks():
    """
    Read the full migration file and create smaller chunks.
    """
    
    # Read the complete migration
    with open("/home/user/webapp/migrations/0014_import_complete_kwikr_dataset.sql", 'r') as f:
        content = f.read()
    
    # Find the users INSERT statement
    lines = content.split('\n')
    users_start_idx = None
    profiles_start_idx = None
    services_start_idx = None
    
    for i, line in enumerate(lines):
        if "INSERT INTO users" in line:
            users_start_idx = i
        elif "INSERT INTO user_profiles" in line:
            profiles_start_idx = i
        elif "INSERT INTO worker_services" in line:
            services_start_idx = i
    
    if not all([users_start_idx, profiles_start_idx, services_start_idx]):
        print("❌ Could not find INSERT statements in migration file")
        return False
    
    # Extract users data (between users_start_idx and profiles_start_idx)
    users_lines = lines[users_start_idx:profiles_start_idx-1]
    
    # Extract profiles data (between profiles_start_idx and services_start_idx) 
    profiles_lines = lines[profiles_start_idx:services_start_idx-1]
    
    # Extract services data (from services_start_idx to end)
    services_lines = lines[services_start_idx:]
    
    # Process users in chunks of 25
    chunk_size = 25
    users_header = users_lines[0]  # "INSERT INTO users (...) VALUES"
    users_data_lines = users_lines[1:]  # The actual data rows
    
    chunk_files = []
    
    # Create user chunks
    for i in range(0, len(users_data_lines), chunk_size):
        chunk_num = i // chunk_size + 1
        chunk_data = users_data_lines[i:i + chunk_size]
        
        # Fix the last line to end with semicolon instead of comma
        if chunk_data:
            last_line = chunk_data[-1].rstrip(',') + ';'
            chunk_data[-1] = last_line
            
        chunk_content = [users_header] + chunk_data
        
        chunk_file = f"/home/user/webapp/import_users_chunk_{chunk_num}.sql"
        with open(chunk_file, 'w') as f:
            f.write('\n'.join(chunk_content))
        
        chunk_files.append(chunk_file)
        print(f"Created users chunk {chunk_num}: {len(chunk_data)} records")
    
    # Create profiles chunk
    profiles_header = profiles_lines[0]
    profiles_data_lines = profiles_lines[1:]
    if profiles_data_lines:
        last_line = profiles_data_lines[-1].rstrip(',') + ';'
        profiles_data_lines[-1] = last_line
    
    profiles_chunk_file = "/home/user/webapp/import_profiles_chunk.sql"
    with open(profiles_chunk_file, 'w') as f:
        f.write('\n'.join([profiles_header] + profiles_data_lines))
    chunk_files.append(profiles_chunk_file)
    
    # Create services chunk
    services_data_lines = []
    for line in services_lines:
        if line.strip():
            services_data_lines.append(line)
    
    if services_data_lines:
        last_line = services_data_lines[-1].rstrip(',') + ';'
        services_data_lines[-1] = last_line
    
    services_chunk_file = "/home/user/webapp/import_services_chunk.sql"
    with open(services_chunk_file, 'w') as f:
        f.write('\n'.join(services_data_lines))
    chunk_files.append(services_chunk_file)
    
    return chunk_files

def main():
    """
    Main import process.
    """
    print("🚀 Starting chunked import of complete Kwikr dataset...")
    
    # Create import chunks
    chunk_files = create_import_chunks()
    if not chunk_files:
        print("❌ Failed to create import chunks")
        return
    
    total_chunks = len(chunk_files)
    successful_imports = 0
    
    # Import each chunk
    for i, chunk_file in enumerate(chunk_files, 1):
        if run_import_chunk(chunk_file, i, total_chunks):
            successful_imports += 1
        else:
            print(f"⚠️ Chunk {i} failed, but continuing...")
        
        # Small delay between chunks
        if i < total_chunks:
            time.sleep(2)
    
    print(f"\n📊 Import Summary:")
    print(f"Total chunks: {total_chunks}")
    print(f"Successful imports: {successful_imports}")
    print(f"Failed imports: {total_chunks - successful_imports}")
    
    # Verify final count
    print("\n🔍 Verifying import...")
    verify_cmd = ["npx", "wrangler", "d1", "execute", "kwikr-directory-production", "--local", "--command=SELECT COUNT(*) as total_users FROM users"]
    
    try:
        result = subprocess.run(verify_cmd, cwd="/home/user/webapp", capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print("✅ Final verification completed")
            print(result.stdout)
        else:
            print("❌ Verification failed")
    except Exception as e:
        print(f"⚠️ Verification error: {e}")
    
    # Clean up chunk files
    for chunk_file in chunk_files:
        try:
            os.remove(chunk_file)
        except:
            pass
    
    print("\n🎉 Import process completed!")

if __name__ == "__main__":
    main()