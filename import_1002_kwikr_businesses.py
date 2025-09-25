#!/usr/bin/env python3
"""
Import ALL 1,002 authentic Kwikr businesses with proper province mapping and small chunks.
"""

import pandas as pd
import re
import subprocess
import time
import os

# Province name to code mapping
PROVINCE_MAPPING = {
    'Ontario': 'ON',
    'Quebec': 'QC', 
    'British Columbia': 'BC',
    'Alberta': 'AB',
    'Manitoba': 'MB',
    'Saskatchewan': 'SK',
    'Nova Scotia': 'NS',
    'New Brunswick': 'NB',
    'Yukon': 'YT',
    'Newfoundland and Labrador': 'NL',
    'Prince Edward Island': 'PE',
    'Northwest Territories': 'NT',
    'Nunavut': 'NU'
}

def clean_text(text):
    """Clean text for SQL insertion."""
    if pd.isna(text) or text is None:
        return ""
    return str(text).replace("'", "''").replace('"', '""').strip()

def generate_email(company_name, index):
    """Generate consistent email from company name."""
    if pd.isna(company_name):
        return f"business{index}@kwikr.ca"
    
    # Clean company name for email
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', str(company_name).lower())[:15]
    if not clean_name:
        return f"business{index}@kwikr.ca"
    
    return f"{clean_name}@kwikr.ca"

def clear_existing_data():
    """Clear existing data from all tables."""
    print("🧹 Clearing existing data...")
    
    clear_commands = [
        "DELETE FROM user_profiles;",
        "DELETE FROM worker_services;", 
        "DELETE FROM users;"
    ]
    
    for cmd in clear_commands:
        result = subprocess.run([
            "npx", "wrangler", "d1", "execute", 
            "kwikr-directory-production", "--local", f"--command={cmd}"
        ], cwd="/home/user/webapp", capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print(f"✅ Cleared: {cmd}")
        else:
            print(f"❌ Failed to clear: {cmd}")
            print(result.stderr)

def import_users_in_small_chunks(df):
    """Import users in chunks of 25 records."""
    print("👥 Importing 1,002 users in small chunks...")
    
    chunk_size = 25
    total_chunks = (len(df) + chunk_size - 1) // chunk_size
    successful_imports = 0
    
    for chunk_num in range(total_chunks):
        start_idx = chunk_num * chunk_size
        end_idx = min(start_idx + chunk_size, len(df))
        chunk_df = df.iloc[start_idx:end_idx]
        
        print(f"📦 Chunk {chunk_num + 1}/{total_chunks}: Records {start_idx + 1}-{end_idx}")
        
        # Build SQL for this chunk
        user_values = []
        
        for idx, row in chunk_df.iterrows():
            # Map province name to code
            province_name = clean_text(row['province'])
            province_code = PROVINCE_MAPPING.get(province_name, 'ON')  # Default to ON
            
            # Generate names from company
            company_words = clean_text(row['company']).split()
            first_name = company_words[0] if company_words else 'Business'
            last_name = company_words[1] if len(company_words) > 1 else 'Owner'
            
            # Generate email
            email = generate_email(row['company'], idx + 1)
            
            # Use provided phone or generate one
            phone_raw = clean_text(row['phone'])
            if phone_raw and len(phone_raw) >= 10:
                phone = phone_raw
            else:
                phone = f"+1-416-{str(idx + 1000)[1:4]}-{str(idx + 1000)[-4:]}"
            
            city = clean_text(row['city']) or 'Toronto'
            
            user_values.append(f"({idx + 1}, '{email}', 'hashed_password_placeholder', 'worker', '{first_name}', '{last_name}', '{phone}', '{province_code}', '{city}', TRUE, TRUE, TRUE, '2024-01-01 12:00:00')")
        
        # Create SQL statement
        sql = f"""INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, province, city, is_verified, email_verified, is_active, created_at) VALUES
{','.join(user_values)};"""
        
        # Write to temp file and execute
        temp_file = f"/tmp/users_chunk_{chunk_num + 1}.sql"
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(sql)
        
        result = subprocess.run([
            "npx", "wrangler", "d1", "execute", 
            "kwikr-directory-production", "--local", f"--file={temp_file}"
        ], cwd="/home/user/webapp", capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print(f"✅ Chunk {chunk_num + 1} imported successfully")
            successful_imports += 1
        else:
            print(f"❌ Chunk {chunk_num + 1} failed: {result.stderr[:200]}...")
        
        # Clean up temp file
        try:
            os.remove(temp_file)
        except:
            pass
        
        # Small delay
        time.sleep(0.5)
    
    print(f"📊 Users Import: {successful_imports}/{total_chunks} chunks successful")
    return successful_imports > 0

def import_profiles_in_small_chunks(df):
    """Import user profiles in chunks of 25 records."""
    print("🏢 Importing 1,002 business profiles in small chunks...")
    
    chunk_size = 25
    total_chunks = (len(df) + chunk_size - 1) // chunk_size
    successful_imports = 0
    
    for chunk_num in range(total_chunks):
        start_idx = chunk_num * chunk_size
        end_idx = min(start_idx + chunk_size, len(df))
        chunk_df = df.iloc[start_idx:end_idx]
        
        print(f"📦 Profile Chunk {chunk_num + 1}/{total_chunks}: Records {start_idx + 1}-{end_idx}")
        
        # Build SQL for this chunk
        profile_values = []
        
        for idx, row in chunk_df.iterrows():
            company_name = clean_text(row['company'])
            description = clean_text(row['description'])
            
            # Create Kwikr logo URL
            logo_filename = clean_text(row['profile_photo'])
            if logo_filename and 'kwikr.ca' in logo_filename:
                profile_image_url = logo_filename
            elif logo_filename and logo_filename != '':
                profile_image_url = f"https://www.kwikr.ca/pictures/profile/{logo_filename}"
            else:
                # Generate from company name
                logo_name = re.sub(r'[^a-zA-Z0-9]', '-', company_name.lower())
                profile_image_url = f"https://kwikr.ca/logos/{logo_name}-logo.png"
            
            address = clean_text(row['address'])
            postal_code = clean_text(row['postal_code'])
            website = clean_text(row['website'])
            
            profile_values.append(f"({idx + 1}, '{company_name}', '{description}', '{profile_image_url}', '{address}', '{postal_code}', '{website}', '2024-01-01 12:00:00')")
        
        # Create SQL statement
        sql = f"""INSERT INTO user_profiles (user_id, company_name, company_description, profile_image_url, address_line1, postal_code, website_url, created_at) VALUES
{','.join(profile_values)};"""
        
        # Write to temp file and execute
        temp_file = f"/tmp/profiles_chunk_{chunk_num + 1}.sql"
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(sql)
        
        result = subprocess.run([
            "npx", "wrangler", "d1", "execute", 
            "kwikr-directory-production", "--local", f"--file={temp_file}"
        ], cwd="/home/user/webapp", capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print(f"✅ Profile Chunk {chunk_num + 1} imported successfully")
            successful_imports += 1
        else:
            print(f"❌ Profile Chunk {chunk_num + 1} failed: {result.stderr[:200]}...")
        
        # Clean up temp file
        try:
            os.remove(temp_file)
        except:
            pass
        
        # Small delay
        time.sleep(0.5)
    
    print(f"📊 Profiles Import: {successful_imports}/{total_chunks} chunks successful")
    return successful_imports > 0

def import_services_in_small_chunks(df):
    """Import worker services in chunks of 25 records."""
    print("⚙️ Importing 1,002 business services in small chunks...")
    
    chunk_size = 25
    total_chunks = (len(df) + chunk_size - 1) // chunk_size
    successful_imports = 0
    
    for chunk_num in range(total_chunks):
        start_idx = chunk_num * chunk_size
        end_idx = min(start_idx + chunk_size, len(df))
        chunk_df = df.iloc[start_idx:end_idx]
        
        print(f"📦 Service Chunk {chunk_num + 1}/{total_chunks}: Records {start_idx + 1}-{end_idx}")
        
        # Build SQL for this chunk
        service_values = []
        
        for idx, row in chunk_df.iterrows():
            category = clean_text(row['category']) or 'Professional Services'
            city = clean_text(row['city']) or 'Toronto'
            service_area = f"Greater {city} Area"
            
            hourly_rate = 75  # Default rate
            if pd.notna(row['hourly_rate']) and row['hourly_rate'] > 0:
                hourly_rate = int(row['hourly_rate'])
            
            service_values.append(f"({idx + 1}, '{category}', '{category}', '{service_area}', {hourly_rate}, '2024-01-01 12:00:00')")
        
        # Create SQL statement
        sql = f"""INSERT INTO worker_services (user_id, service_name, service_category, service_area, hourly_rate, created_at) VALUES
{','.join(service_values)};"""
        
        # Write to temp file and execute
        temp_file = f"/tmp/services_chunk_{chunk_num + 1}.sql"
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(sql)
        
        result = subprocess.run([
            "npx", "wrangler", "d1", "execute", 
            "kwikr-directory-production", "--local", f"--file={temp_file}"
        ], cwd="/home/user/webapp", capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print(f"✅ Service Chunk {chunk_num + 1} imported successfully")
            successful_imports += 1
        else:
            print(f"❌ Service Chunk {chunk_num + 1} failed: {result.stderr[:200]}...")
        
        # Clean up temp file
        try:
            os.remove(temp_file)
        except:
            pass
        
        # Small delay
        time.sleep(0.5)
    
    print(f"📊 Services Import: {successful_imports}/{total_chunks} chunks successful")
    return successful_imports > 0

def verify_import():
    """Verify the final import counts."""
    print("\n🔍 Verifying complete import...")
    
    # Check users
    result = subprocess.run([
        "npx", "wrangler", "d1", "execute", 
        "kwikr-directory-production", "--local", 
        "--command=SELECT COUNT(*) as total_users FROM users"
    ], cwd="/home/user/webapp", capture_output=True, text=True, timeout=30)
    
    if result.returncode == 0:
        print("👥 Users count:")
        print(result.stdout)
    
    # Check profiles
    result = subprocess.run([
        "npx", "wrangler", "d1", "execute", 
        "kwikr-directory-production", "--local", 
        "--command=SELECT COUNT(*) as total_profiles FROM user_profiles"
    ], cwd="/home/user/webapp", capture_output=True, text=True, timeout=30)
    
    if result.returncode == 0:
        print("🏢 Profiles count:")
        print(result.stdout)
    
    # Check services
    result = subprocess.run([
        "npx", "wrangler", "d1", "execute", 
        "kwikr-directory-production", "--local", 
        "--command=SELECT COUNT(*) as total_services FROM worker_services"
    ], cwd="/home/user/webapp", capture_output=True, text=True, timeout=30)
    
    if result.returncode == 0:
        print("⚙️ Services count:")
        print(result.stdout)

def main():
    """Main import process for all 1,002 authentic Kwikr businesses."""
    print("🎯 IMPORTING ALL 1,002 AUTHENTIC KWIKR BUSINESSES")
    print("=" * 60)
    
    # Read Excel file
    print("📖 Reading complete Kwikr dataset from Excel...")
    df = pd.read_excel('/home/user/webapp/Kwikr_complete_data.xlsx')
    print(f"📊 Found {len(df)} authentic Kwikr businesses")
    
    # Show province distribution
    print("\n🗺️ Province Distribution:")
    for province, count in df['province'].value_counts().items():
        code = PROVINCE_MAPPING.get(province, '??')
        print(f"  {province} ({code}): {count} businesses")
    
    # Clear existing data
    clear_existing_data()
    
    # Import in sequence
    print("\n🚀 Starting sequential import of all data...")
    
    # Import users first
    users_success = import_users_in_small_chunks(df)
    
    if users_success:
        # Import profiles
        profiles_success = import_profiles_in_small_chunks(df)
        
        # Import services
        services_success = import_services_in_small_chunks(df)
    else:
        print("❌ Users import failed, skipping profiles and services")
    
    # Verify results
    verify_import()
    
    print("\n🎉 COMPLETE 1,002 KWIKR BUSINESSES IMPORT FINISHED!")

if __name__ == "__main__":
    main()