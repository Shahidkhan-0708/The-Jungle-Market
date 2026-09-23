import pandas as pd
import numpy as np
import random
import os

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

num_records = 1000

categories = ['Bamboo & cane', 'Terracotta clay', 'Dokra bell metal', 'Tribal handloom', 'Woodcraft & carving']
regions = ['Bastar, Chhattisgarh', 'Kondagaon, Chhattisgarh', 'Mandla, Madhya Pradesh', 'Dumka, Jharkhand']
seasons = ['Festive', 'Off-season', 'Wedding', 'Monsoon']

data = []

for i in range(num_records):
    category = random.choice(categories)
    region = random.choice(regions)
    season = random.choice(seasons)
    
    # Category specific logic
    if category == 'Bamboo & cane':
        materials = 'Bamboo, Cane, Natural fibers'
        length = round(np.random.uniform(10, 80), 1)
        width = round(np.random.uniform(10, 50), 1)
        height = round(np.random.uniform(5, 40), 1)
        weight = round(np.random.uniform(0.2, 3.0), 2)
        complexity = random.randint(2, 7)
        labour_hours = random.randint(2, 15)
        rm_cost = round(np.random.uniform(50, 300), 2)
    elif category == 'Terracotta clay':
        materials = 'Natural clay, Natural colors'
        length = round(np.random.uniform(10, 40), 1)
        width = round(np.random.uniform(10, 40), 1)
        height = round(np.random.uniform(10, 60), 1)
        weight = round(np.random.uniform(0.5, 5.0), 2)
        complexity = random.randint(3, 8)
        labour_hours = random.randint(5, 20)
        rm_cost = round(np.random.uniform(80, 400), 2)
    elif category == 'Dokra bell metal':
        materials = 'Brass, Bell metal, Beeswax'
        length = round(np.random.uniform(5, 30), 1)
        width = round(np.random.uniform(5, 20), 1)
        height = round(np.random.uniform(10, 40), 1)
        weight = round(np.random.uniform(0.5, 4.0), 2)
        complexity = random.randint(6, 10)
        labour_hours = random.randint(15, 60)
        rm_cost = round(np.random.uniform(300, 1500), 2)
    elif category == 'Tribal handloom':
        materials = 'Cotton, Silk, Organic dyes'
        length = round(np.random.uniform(100, 250), 1)
        width = round(np.random.uniform(50, 120), 1)
        height = round(np.random.uniform(0.1, 0.5), 1)
        weight = round(np.random.uniform(0.3, 1.5), 2)
        complexity = random.randint(5, 9)
        labour_hours = random.randint(20, 80)
        rm_cost = round(np.random.uniform(400, 2500), 2)
    else: # Woodcraft
        materials = 'Teak wood, Sal wood, Natural polish'
        length = round(np.random.uniform(20, 100), 1)
        width = round(np.random.uniform(10, 50), 1)
        height = round(np.random.uniform(10, 60), 1)
        weight = round(np.random.uniform(1.0, 10.0), 2)
        complexity = random.randint(4, 9)
        labour_hours = random.randint(10, 50)
        rm_cost = round(np.random.uniform(200, 1200), 2)

    hourly_wage = random.choice([60, 75, 90, 100, 120])
    
    # Calculate Cost Floor
    cost_floor = rm_cost + (labour_hours * hourly_wage)
    
    # Market variations
    season_multiplier = 1.2 if season in ['Festive', 'Wedding'] else 1.0
    complexity_multiplier = 1.0 + (complexity * 0.05)
    
    # Target Sale Price (what the model will predict as the P50 median)
    base_price = cost_floor * 1.3 # 30% artisan margin
    target_sale_price = round(base_price * season_multiplier * complexity_multiplier * np.random.uniform(0.9, 1.1))
    
    # Actual sale price (for training, with some noise)
    actual_sale_price = target_sale_price + np.random.normal(0, target_sale_price * 0.05)
    actual_sale_price = round(actual_sale_price)
    
    data.append({
        'product_id': f"CRAFT-{1000+i}",
        'category': category,
        'primary_materials': materials,
        'length_cm': length,
        'width_cm': width,
        'height_cm': height,
        'weight_kg': weight,
        'region': region,
        'season': season,
        'complexity_score': complexity,
        'labour_hours': labour_hours,
        'artisan_hourly_wage_inr': hourly_wage,
        'raw_material_cost_inr': rm_cost,
        'calculated_cost_floor_inr': round(cost_floor),
        'historical_sale_price_inr': actual_sale_price
    })

df = pd.DataFrame(data)
output_path = os.path.join(os.path.dirname(__file__), 'pricing_model_dataset.csv')
df.to_csv(output_path, index=False)
print(f"Dataset generated successfully at: {output_path}")
