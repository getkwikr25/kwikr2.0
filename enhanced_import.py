#!/usr/bin/env python3

import pandas as pd
import sqlite3
import json
import re
import hashlib
import secrets
import requests
import os
import random
from datetime import datetime
from urllib.parse import urlparse

def clean_text(text):
    """Clean and normalize text data"""
    if pd.isna(text):
        return ""
    clean = str(text).strip()
    # Remove extra whitespace
    clean = ' '.join(clean.split())
    return clean

def extract_name_from_company(company_name):
    """Enhanced name extraction for different business patterns"""
    if pd.isna(company_name):
        return "Business", "Owner"
    
    company = str(company_name).strip()
    
    # Patterns for extracting names from business names
    patterns = [
        # Personal names: "John Smith Plumbing" → John, Smith
        r'^([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:\s+.*)?$',
        # French names: "Jean-Claude Plomberie" → Jean, Claude
        r'^([A-Z][a-z]+)-([A-Z][a-z]+)(?:\s+.*)?$',
        # Initials + surname: "R Smith Electrical" → R, Smith
        r'^([A-Z])\s+([A-Z][a-z]+)(?:\s+.*)?$',
        # Multiple initials: "R & B Heating" → R, B
        r'^([A-Z])\s*&\s*([A-Z])(?:\s+.*)?$',
        # Company with owner: "Smith's Plumbing" → Smith, Business
        r'^([A-Z][a-z]+)\'?s\s+.*$',
    ]
    
    for pattern in patterns:
        match = re.match(pattern, company)
        if match:
            first = match.group(1)
            last = match.group(2) if len(match.groups()) > 1 and match.group(2) else "Business"
            return first, last
    
    # Extract first significant word as name
    words = company.split()
    # Remove common business words
    business_words = {'ltd', 'inc', 'corp', 'llc', 'plumbing', 'heating', 'electrical', 
                     'services', 'systems', 'solutions', 'contractors', 'construction',
                     'plomberie', 'chauffage', 'electrique'}
    
    significant_words = [w for w in words if w.lower() not in business_words and len(w) > 2]
    
    if significant_words:
        if len(significant_words) >= 2:
            return significant_words[0], significant_words[1]
        else:
            return significant_words[0], "Business"
    
    # Fallback: use first word
    if words:
        return words[0], "Business"
    
    return "Business", "Owner"

def categorize_service(category, services_provided):
    """Map original categories to our standardized service categories"""
    if pd.isna(category):
        category = ""
    if pd.isna(services_provided):
        services_provided = ""
    
    text = f"{category} {services_provided}".lower()
    
    # Service mapping with priority order
    service_mappings = [
        ('Plumbing', ['plumbing', 'drain', 'sewer', 'pipe', 'faucet', 'toilet', 'water']),
        ('Electrical', ['electrical', 'electric', 'wiring', 'lighting', 'automation', 'panel']),
        ('HVAC', ['hvac', 'heating', 'cooling', 'furnace', 'air conditioning', 'ventilation']),
        ('Flooring', ['flooring', 'hardwood', 'laminate', 'vinyl', 'carpet', 'tile', 'refinishing']),
        ('Roofing', ['roofing', 'roof', 'shingle', 'gutter']),
        ('General Contracting', ['contracting', 'contractor', 'construction', 'renovation', 'reno']),
        ('Cleaning', ['cleaning', 'pressure washing', 'window', 'carpet cleaning', 'office cleaning']),
        ('Landscaping', ['landscaping', 'landscape', 'lawn', 'garden', 'seasonal']),
    ]
    
    for service_cat, keywords in service_mappings:
        if any(keyword in text for keyword in keywords):
            return service_cat
    
    # Default fallback
    return 'General Contracting'

def calculate_hourly_rate(province, service_category, subscription_type):
    """Calculate realistic hourly rates"""
    # Base rates by service category
    base_rates = {
        'Plumbing': 85,
        'Electrical': 90,
        'HVAC': 95,
        'Flooring': 65,
        'Roofing': 75,
        'General Contracting': 70,
        'Cleaning': 45,
        'Landscaping': 55,
    }
    
    # Province multipliers (cost of living adjustments)
    province_multipliers = {
        'Ontario': 1.15,
        'British Columbia': 1.20,
        'Alberta': 1.10,
        'Quebec': 1.05,
        'Manitoba': 0.95,
        'Saskatchewan': 0.90,
        'Nova Scotia': 0.90,
        'New Brunswick': 0.85,
        'Newfoundland and Labrador': 0.80,
        'Prince Edward Island': 0.85,
        'Yukon': 1.25,
        'Northwest Territories': 1.30,
        'Nunavut': 1.35
    }
    
    # Subscription multipliers
    subscription_multipliers = {
        'Pro Plan': 1.25,
        'Growth Plan': 1.10,
        'Pay-as-you-go': 1.00
    }
    
    base_rate = base_rates.get(service_category, 75)
    prov_mult = province_multipliers.get(province, 1.0)
    sub_mult = subscription_multipliers.get(subscription_type, 1.0)
    
    # Add some realistic variation (±10%)
    variation = random.uniform(0.9, 1.1)
    
    return round(base_rate * prov_mult * sub_mult * variation, 2)

def determine_compliance_status(province, service_category, subscription_type):
    """Assign realistic compliance status"""
    # Higher subscription tiers tend to have better compliance
    if subscription_type == 'Pro Plan':
        statuses = ['compliant', 'partial', 'partial']  # 33% compliant, 67% partial
    elif subscription_type == 'Growth Plan':
        statuses = ['compliant', 'partial', 'partial', 'non_compliant']  # 25% compliant, 50% partial, 25% non-compliant
    else:  # Pay-as-you-go
        statuses = ['partial', 'partial', 'non_compliant', 'non_compliant']  # 0% compliant, 50% partial, 50% non-compliant
    
    return random.choice(statuses)

def map_province_to_code(province_name):
    """Map full province names to 2-letter codes"""
    province_mapping = {
        'Alberta': 'AB',
        'British Columbia': 'BC',
        'Manitoba': 'MB',
        'New Brunswick': 'NB',
        'Newfoundland and Labrador': 'NL',
        'Northwest Territories': 'NT',
        'Nova Scotia': 'NS',
        'Nunavut': 'NU',
        'Ontario': 'ON',
        'Prince Edward Island': 'PE',
        'Quebec': 'QC',
        'Saskatchewan': 'SK',
        'Yukon': 'YT',
        # Handle common variations
        'Newfoundland': 'NL',
        'P.E.I.': 'PE',
        'PEI': 'PE',
        'NWT': 'NT',
        'Que': 'QC',
        'Sask': 'SK',
        'BC': 'BC',  # Already correct
        'AB': 'AB',  # Already correct
        'ON': 'ON',  # Already correct
        'QC': 'QC',  # Already correct
        'MB': 'MB',  # Already correct
        'SK': 'SK',  # Already correct
        'NS': 'NS',  # Already correct
        'NB': 'NB',  # Already correct
        'PE': 'PE',  # Already correct
        'NL': 'NL',  # Already correct
        'YT': 'YT',  # Already correct
        'NT': 'NT',  # Already correct
        'NU': 'NU',  # Already correct
    }
    
    if pd.isna(province_name):
        return 'ON'  # Default to Ontario
    
    province_clean = str(province_name).strip()
    
    # Try exact match first
    if province_clean in province_mapping:
        return province_mapping[province_clean]
    
    # Try case-insensitive match
    for full_name, code in province_mapping.items():
        if province_clean.lower() == full_name.lower():
            return code
    
    # If no match found, default to Ontario
    print(f"  Warning: Unknown province '{province_clean}', defaulting to ON")
    return 'ON'

def calculate_compliance_percentage(status):
    """Calculate compliance percentage based on status"""
    percentages = {
        'compliant': random.randint(85, 100),
        'partial': random.randint(40, 84),
        'non_compliant': random.randint(0, 39)
    }
    return percentages.get(status, 50)

def download_and_store_logo(photo_url, company_name, user_id):
    """Download logo and store it locally (simulation)"""
    if pd.isna(photo_url) or not photo_url:
        return None
    
    try:
        # For this demo, we'll just return the original URL
        # In a real implementation, you would:
        # 1. Download the image
        # 2. Store it in Cloudflare R2 or local storage
        # 3. Return the new URL
        
        # Validate URL format
        if photo_url.startswith('http'):
            return photo_url
        else:
            return None
    except:
        return None

def import_complete_dataset(excel_file, db_file):
    """Import the complete 1000+ worker dataset"""
    
    print("=== ENHANCED KWIKR WORKER IMPORT ===")
    print(f"Loading dataset from: {excel_file}")
    
    # Read Excel data
    df = pd.read_excel(excel_file)
    print(f"Found {len(df)} businesses to import")
    
    # Connect to database
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    # Import statistics
    stats = {
        'total': len(df),
        'imported': 0,
        'skipped': 0,
        'errors': 0,
        'provinces': set(),
        'service_categories': set(),
        'with_logos': 0
    }
    

    
    for index, row in df.iterrows():
        try:
            if index % 100 == 0:
                print(f"Processing {index + 1}/{len(df)}...")
            
            company = clean_text(row.get('company', ''))
            email = clean_text(row.get('email', ''))
            
            if not company or not email:
                stats['errors'] += 1
                continue
            
            # Skip if email already exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                stats['skipped'] += 1
                continue
            
            # Extract and prepare data
            first_name, last_name = extract_name_from_company(company)
            province_full = clean_text(row.get('province', ''))
            province = map_province_to_code(province_full)  # Convert to 2-letter code
            city = clean_text(row.get('city', ''))
            service_category = categorize_service(row.get('category'), row.get('services_provided'))
            subscription_type = clean_text(row.get('subscription_type', 'Pay-as-you-go'))
            
            # Calculate rates and compliance (use full province name for rate calculation)
            hourly_rate = calculate_hourly_rate(province_full, service_category, subscription_type)
            compliance_status = determine_compliance_status(province, service_category, subscription_type)
            compliance_percentage = calculate_compliance_percentage(compliance_status)
            
            # Generate secure credentials
            password = secrets.token_urlsafe(16)
            password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), b'salt', 100000).hex()
            
            # Handle profile photo
            profile_photo_url = download_and_store_logo(
                row.get('profile_photo'), company, None
            )
            
            # Insert user
            cursor.execute("""
                INSERT INTO users (
                    email, password_hash, password_salt, role, first_name, last_name, 
                    province, city, is_verified, is_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                email, password_hash, 'salt', 'worker', first_name, last_name,
                province, city, 1, 1, datetime.now().isoformat()
            ))
            
            user_id = cursor.lastrowid
            
            # Insert user profile
            cursor.execute("""
                INSERT INTO user_profiles (
                    user_id, bio, company_name, company_description, website_url, 
                    address_line1, postal_code, profile_image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, 
                clean_text(row.get('description', ''))[:1000],
                company,
                clean_text(row.get('description', ''))[:500],
                clean_text(row.get('website', '')),
                clean_text(row.get('address', '')),
                clean_text(row.get('postal_code', '')),
                profile_photo_url
            ))
            
            # Insert worker service
            cursor.execute("""
                INSERT INTO worker_services (
                    user_id, service_category, service_name, description, 
                    hourly_rate, is_available, service_area, years_experience
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, service_category, f"{service_category} Services",
                f"Professional {service_category.lower()} services in {city}, {province}",
                hourly_rate, 1, f"{city}, {province}", random.randint(3, 15)
            ))
            
            # Insert service area
            if city:
                cursor.execute("""
                    INSERT INTO worker_service_areas (user_id, area_name, is_active)
                    VALUES (?, ?, ?)
                """, (user_id, city, 1))
            
            # Create compliance summary
            cursor.execute("""
                INSERT INTO worker_compliance_summary (
                    user_id, province, primary_trade, overall_compliance_status,
                    compliance_percentage, total_requirements, compliant_requirements,
                    pending_requirements, expired_requirements
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, province, service_category, compliance_status,
                compliance_percentage, 5, 
                2 if compliance_status == 'compliant' else 1 if compliance_status == 'partial' else 0,
                3 if compliance_status == 'partial' else 2 if compliance_status == 'non_compliant' else 1,
                0 if compliance_status in ['compliant', 'partial'] else 2
            ))
            
            # Update statistics
            stats['imported'] += 1
            stats['provinces'].add(f"{province} ({province_full})")  # Show both code and full name
            stats['service_categories'].add(service_category)
            if profile_photo_url:
                stats['with_logos'] += 1
                
        except Exception as e:
            stats['errors'] += 1
            print(f"  Error importing {row.get('company', 'Unknown')}: {e}")
            continue
    
    # Commit all changes
    conn.commit()
    conn.close()
    
    # Print comprehensive statistics
    print("\n=== IMPORT COMPLETE ===")
    print(f"✅ Successfully imported: {stats['imported']} businesses")
    print(f"⏭️  Skipped (duplicates): {stats['skipped']}")
    print(f"❌ Errors: {stats['errors']}")
    print(f"📊 Success rate: {stats['imported']/stats['total']*100:.1f}%")
    print(f"🖼️  Businesses with logos: {stats['with_logos']}")
    print(f"🗺️  Provinces covered: {len(stats['provinces'])}")
    print(f"🔧 Service categories: {len(stats['service_categories'])}")
    
    print("\n=== PROVINCES ===")
    for province in sorted(stats['provinces']):
        print(f"  • {province}")
    
    print("\n=== SERVICE CATEGORIES ===")
    for category in sorted(stats['service_categories']):
        print(f"  • {category}")
    
    return stats

if __name__ == "__main__":
    stats = import_complete_dataset(
        "Kwikr_platform_import-sept-2025.xlsx", 
        ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/a31fcc237b8df81a82a97d8eeaf66c7474deb533ac08d408898123bbd56ffee7.sqlite"
    )