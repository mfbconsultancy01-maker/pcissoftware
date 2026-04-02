#!/usr/bin/env python3
"""
PCIS DLD Data Processor
-----------------------
Reads raw DLD CSV export and generates TypeScript data files
for the SCOUT market intelligence panels.

Input:  public/data/dld-transactions-2026.csv (58K+ rows)
Output: src/lib/realTransactionData.ts   (transactions, volumes, buildings)
        src/lib/realMarketData.ts        (area profiles, demographics)
"""

import csv
import json
import math
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta

CSV_PATH = "public/data/dld-transactions-2026.csv"
TX_OUT = "src/lib/realTransactionData.ts"
MKT_OUT = "src/lib/realMarketData.ts"

# Area coordinates for map rendering (major Dubai areas)
AREA_COORDS = {
    "JUMEIRAH VILLAGE CIRCLE": {"lat": 25.0580, "lng": 55.2100},
    "BUSINESS BAY": {"lat": 25.1860, "lng": 55.2640},
    "DUBAI MARINA": {"lat": 25.0800, "lng": 55.1400},
    "BURJ KHALIFA": {"lat": 25.1972, "lng": 55.2744},
    "PALM JUMEIRAH": {"lat": 25.1124, "lng": 55.1390},
    "DUBAI LAND RESIDENCE COMPLEX": {"lat": 25.0400, "lng": 55.2500},
    "MAJAN": {"lat": 25.0350, "lng": 55.2200},
    "ARJAN": {"lat": 25.0430, "lng": 55.2430},
    "DUBAI PRODUCTION CITY": {"lat": 25.0380, "lng": 55.1890},
    "DUBAI SPORTS CITY": {"lat": 25.0300, "lng": 55.2100},
    "MOTOR CITY": {"lat": 25.0450, "lng": 55.2350},
    "JUMEIRAH LAKES TOWERS": {"lat": 25.0770, "lng": 55.1500},
    "JUMEIRAH VILLAGE TRIANGLE": {"lat": 25.0550, "lng": 55.2040},
    "SILICON OASIS": {"lat": 25.1200, "lng": 55.3800},
    "AL FURJAN": {"lat": 25.0280, "lng": 55.1550},
    "BUSINESS PARK": {"lat": 25.0350, "lng": 55.1970},
    "DAMAC HILLS": {"lat": 25.0250, "lng": 55.2380},
    "WADI AL SAFA 5": {"lat": 25.0860, "lng": 55.2580},
    "DOWNTOWN DUBAI": {"lat": 25.1972, "lng": 55.2744},
    "DUBAI HILLS": {"lat": 25.1170, "lng": 55.2500},
    "DUBAI HILLS ESTATE": {"lat": 25.1100, "lng": 55.2500},
    "DUBAI SOUTH": {"lat": 24.9500, "lng": 55.1600},
    "EMIRATES HILLS": {"lat": 25.0750, "lng": 55.1850},
    "INTERNATIONAL CITY": {"lat": 25.1610, "lng": 55.4110},
    "TOWN SQUARE": {"lat": 25.0240, "lng": 55.2700},
    "MBR CITY": {"lat": 25.1650, "lng": 55.3200},
    "DUBAI CREEK HARBOUR": {"lat": 25.1940, "lng": 55.3440},
    "SOBHA HARTLAND": {"lat": 25.1750, "lng": 55.3100},
    "EMAAR SOUTH": {"lat": 24.9700, "lng": 55.1600},
    "THE VALLEY": {"lat": 25.0180, "lng": 55.3800},
    "TILAL AL GHAF": {"lat": 25.0600, "lng": 55.2900},
    "CITY WALK": {"lat": 25.2100, "lng": 55.2600},
    "LA MER": {"lat": 25.2320, "lng": 55.2550},
    "JBR": {"lat": 25.0780, "lng": 55.1340},
    "DIFC": {"lat": 25.2100, "lng": 55.2800},
    "ARABIAN RANCHES": {"lat": 25.0590, "lng": 55.2680},
    "Madinat Al Mataar": {"lat": 25.0100, "lng": 55.1400},
    "Palm Deira": {"lat": 25.2900, "lng": 55.3400},
    "Al Yelayiss 1": {"lat": 24.9800, "lng": 55.2200},
    "Al Yelayiss 5": {"lat": 24.9700, "lng": 55.2300},
    "Al Khairan First": {"lat": 24.9900, "lng": 55.1800},
}

DEFAULT_COORD = {"lat": 25.2048, "lng": 55.2708}


def slug(name):
    """Convert area name to URL-friendly ID"""
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def short_code(name):
    """Generate 3-4 char terminal-style code"""
    parts = name.upper().split()
    if len(parts) == 1:
        return parts[0][:4]
    return ''.join(p[0] for p in parts[:4])


def sqm_to_sqft(sqm):
    return sqm * 10.7639


def parse_bedrooms(rooms_str):
    if not rooms_str or rooms_str == 'NA':
        return 0
    rooms_str = rooms_str.strip()
    if rooms_str == 'Studio':
        return 0
    if rooms_str == 'Office' or rooms_str == 'Shop':
        return 0
    if rooms_str == 'PENTHOUSE':
        return 4
    if rooms_str == 'Hotel':
        return 1
    m = re.match(r'(\d+)', rooms_str)
    return int(m.group(1)) if m else 0


def map_property_type(prop_type, prop_sub_type, rooms_str):
    if prop_type == 'Land':
        return 'Land'
    if prop_type == 'Building':
        return 'Apartment'
    rooms_str = rooms_str.strip() if rooms_str else ''
    if rooms_str == 'PENTHOUSE':
        return 'Penthouse'
    if rooms_str == 'Office':
        return 'Office'
    if rooms_str == 'Shop':
        return 'Retail'
    if prop_sub_type == 'Villa':
        return 'Villa'
    if prop_sub_type == 'Flat':
        return 'Apartment'
    return 'Apartment'


def map_transaction_type(group_en):
    mapping = {'Sales': 'Sale', 'Mortgage': 'Mortgage', 'Gifts': 'Gift'}
    return mapping.get(group_en, 'Sale')


def js_str(s):
    """Escape string for JS"""
    return s.replace("'", "\\'").replace('"', '\\"')


def main():
    print("Reading CSV...")
    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        raw_rows = list(reader)

    print(f"Loaded {len(raw_rows)} raw rows")

    # =========================================================================
    # PHASE 1: Transform all rows
    # =========================================================================
    transactions = []

    # First pass: compute area and building averages
    area_values = defaultdict(list)  # area -> list of price_per_sqft
    building_values = defaultdict(list)

    for row in raw_rows:
        try:
            area = row['AREA_EN'].strip()
            actual_area_sqm = float(row['ACTUAL_AREA'] or 0)
            trans_value = float(row['TRANS_VALUE'] or 0)
            if actual_area_sqm > 0 and trans_value > 0:
                size_sqft = sqm_to_sqft(actual_area_sqm)
                price_sqft = trans_value / size_sqft
                if 10 < price_sqft < 50000:  # sanity filter
                    area_values[area].append(price_sqft)
                    project = row['PROJECT_EN'].strip()
                    if project:
                        building_values[f"{area}|{project}"].append(price_sqft)
        except (ValueError, KeyError):
            continue

    area_avg_psf = {a: sum(v)/len(v) for a, v in area_values.items() if len(v) >= 3}
    building_avg_psf = {b: sum(v)/len(v) for b, v in building_values.items() if len(v) >= 2}

    print(f"Computed averages for {len(area_avg_psf)} areas, {len(building_avg_psf)} buildings")

    # Second pass: build full transaction objects
    for i, row in enumerate(raw_rows):
        try:
            area = row['AREA_EN'].strip()
            project = row['PROJECT_EN'].strip() or row['MASTER_PROJECT_EN'].strip() or 'Unknown'
            actual_area_sqm = float(row['ACTUAL_AREA'] or 0)
            trans_value = float(row['TRANS_VALUE'] or 0)

            if trans_value <= 0:
                continue

            size_sqft = sqm_to_sqft(actual_area_sqm) if actual_area_sqm > 0 else 0
            price_sqft = (trans_value / size_sqft) if size_sqft > 0 else 0

            area_id = slug(area)
            area_avg = area_avg_psf.get(area, 0)
            bld_key = f"{area}|{project}"
            bld_avg = building_avg_psf.get(bld_key, 0)

            price_vs_area = ((price_sqft / area_avg) - 1) * 100 if area_avg > 0 and price_sqft > 0 else 0
            price_vs_bld = ((price_sqft / bld_avg) - 1) * 100 if bld_avg > 0 and price_sqft > 0 else 0

            tx = {
                "id": f"DLD-{row['TRANSACTION_NUMBER']}-{i}",
                "date": row['INSTANCE_DATE'][:10],
                "area": area,
                "areaId": area_id,
                "building": project,
                "propertyType": map_property_type(
                    row['PROP_TYPE_EN'].strip(),
                    row['PROP_SB_TYPE_EN'].strip(),
                    row['ROOMS_EN']
                ),
                "bedrooms": parse_bedrooms(row['ROOMS_EN']),
                "size": round(size_sqft),
                "transactionValue": round(trans_value),
                "priceSqft": round(price_sqft),
                "transactionType": map_transaction_type(row['GROUP_EN'].strip()),
                "usageType": 'Residential' if row['USAGE_EN'].strip() == 'Residential' else 'Commercial',
                "isOffPlan": row['IS_OFFPLAN_EN'].strip() == 'Off-Plan',
                "registrationStatus": "Registered",
                "paymentMethod": "Mortgage" if row['GROUP_EN'].strip() == 'Mortgage' else "Cash",
                "nearestMetro": row['NEAREST_METRO_EN'].strip(),
                "nearestMall": row['NEAREST_MALL_EN'].strip(),
                "nearestLandmark": row['NEAREST_LANDMARK_EN'].strip(),
                "isFreeHold": row['IS_FREE_HOLD_EN'].strip() == 'Free Hold',
                "areaAvgPriceSqft": round(area_avg),
                "buildingAvgPriceSqft": round(bld_avg) if bld_avg > 0 else None,
                "priceVsAreaAvg": round(price_vs_area, 1),
                "priceVsBuildingAvg": round(price_vs_bld, 1) if bld_avg > 0 else None,
            }
            transactions.append(tx)
        except (ValueError, KeyError, ZeroDivisionError):
            continue

    print(f"Processed {len(transactions)} valid transactions")

    # =========================================================================
    # PHASE 2: Compute aggregations
    # =========================================================================

    # --- Sales only for most analytics ---
    sales = [t for t in transactions if t['transactionType'] == 'Sale']
    print(f"Sales transactions: {len(sales)}")

    # --- Transaction Summary ---
    total_value = sum(t['transactionValue'] for t in sales)
    valid_psf = [t['priceSqft'] for t in sales if t['priceSqft'] > 0]
    offplan_count = sum(1 for t in sales if t['isOffPlan'])
    mortgage_count = sum(1 for t in transactions if t['transactionType'] == 'Mortgage')

    area_counts = Counter(t['area'] for t in sales)
    top_area = area_counts.most_common(1)[0][0] if area_counts else 'Unknown'

    summary = {
        "totalTransactions": len(sales),
        "totalValue": round(total_value),
        "avgTransactionValue": round(total_value / len(sales)) if sales else 0,
        "avgPriceSqft": round(sum(valid_psf) / len(valid_psf)) if valid_psf else 0,
        "offPlanPct": round(offplan_count / len(sales) * 100, 1) if sales else 0,
        "cashPct": round((len(sales) - mortgage_count) / len(sales) * 100, 1) if sales else 0,
        "topArea": top_area,
        "topNationality": "N/A",
        "momVolumeChange": 0,  # computed below
        "yoyVolumeChange": 0,
    }

    # --- Volume by Month ---
    month_data = defaultdict(lambda: {"count": 0, "value": 0, "offplan": 0, "cash": 0})
    for t in sales:
        month = t['date'][:7]
        month_data[month]["count"] += 1
        month_data[month]["value"] += t['transactionValue']
        if t['isOffPlan']:
            month_data[month]["offplan"] += 1
        if t['paymentMethod'] == 'Cash':
            month_data[month]["cash"] += 1

    volume_by_month = []
    sorted_months = sorted(month_data.keys())
    for m in sorted_months:
        d = month_data[m]
        volume_by_month.append({
            "period": m,
            "transactions": d["count"],
            "totalValue": round(d["value"]),
            "avgValue": round(d["value"] / d["count"]) if d["count"] > 0 else 0,
            "offPlanPct": round(d["offplan"] / d["count"] * 100, 1) if d["count"] > 0 else 0,
            "cashPct": round(d["cash"] / d["count"] * 100, 1) if d["count"] > 0 else 0,
        })

    # MoM change
    if len(volume_by_month) >= 2:
        prev = volume_by_month[-2]["transactions"]
        curr = volume_by_month[-1]["transactions"]
        if prev > 0:
            summary["momVolumeChange"] = round((curr / prev - 1) * 100, 1)

    # --- Volume by Week ---
    week_data = defaultdict(lambda: {"count": 0, "value": 0})
    for t in sales:
        try:
            dt = datetime.strptime(t['date'], '%Y-%m-%d')
            iso_year, iso_week, _ = dt.isocalendar()
            week_key = f"{iso_year}-W{iso_week:02d}"
            week_data[week_key]["count"] += 1
            week_data[week_key]["value"] += t['transactionValue']
        except:
            pass

    volume_by_week = []
    for w in sorted(week_data.keys()):
        d = week_data[w]
        volume_by_week.append({
            "period": w,
            "transactions": d["count"],
            "totalValue": round(d["value"]),
            "avgValue": round(d["value"] / d["count"]) if d["count"] > 0 else 0,
        })

    # --- Volume by Area (top 40) ---
    area_stats = defaultdict(lambda: {
        "count": 0, "value": 0, "psf_vals": [], "offplan": 0, "sizes": [],
        "by_month": defaultdict(int), "by_type": Counter(), "by_rooms": Counter(),
        "projects": set(), "dates": [],
    })

    for t in sales:
        a = t['area']
        s = area_stats[a]
        s["count"] += 1
        s["value"] += t['transactionValue']
        if t['priceSqft'] > 0:
            s["psf_vals"].append(t['priceSqft'])
        if t['size'] > 0:
            s["sizes"].append(t['size'])
        s["offplan"] += 1 if t['isOffPlan'] else 0
        s["by_month"][t['date'][:7]] += 1
        s["by_type"][t['propertyType']] += 1
        s["by_rooms"][t['bedrooms']] += 1
        s["projects"].add(t['building'])
        s["dates"].append(t['date'])

    # Sort areas by transaction count
    top_areas = sorted(area_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:40]

    volume_by_area = []
    for area_name, stats in top_areas:
        avg_psf = sum(stats["psf_vals"]) / len(stats["psf_vals"]) if stats["psf_vals"] else 0

        # MoM change
        months = sorted(stats["by_month"].keys())
        mom = 0
        if len(months) >= 2:
            prev_m = stats["by_month"][months[-2]]
            curr_m = stats["by_month"][months[-1]]
            if prev_m > 0:
                mom = round((curr_m / prev_m - 1) * 100, 1)

        volume_by_area.append({
            "area": area_name,
            "areaId": slug(area_name),
            "transactions": stats["count"],
            "totalValue": round(stats["value"]),
            "avgPriceSqft": round(avg_psf),
            "momChange": mom,
            "yoyChange": 0,  # no YoY data yet
        })

    # --- Volume by Property Type ---
    type_counts = Counter(t['propertyType'] for t in sales)
    type_values = defaultdict(float)
    for t in sales:
        type_values[t['propertyType']] += t['transactionValue']

    volume_by_type = []
    for pt, count in type_counts.most_common():
        volume_by_type.append({
            "propertyType": pt,
            "transactions": count,
            "totalValue": round(type_values[pt]),
            "avgValue": round(type_values[pt] / count) if count > 0 else 0,
            "pctOfTotal": round(count / len(sales) * 100, 1) if sales else 0,
        })

    # --- Top Transactions (100 highest value sales) ---
    top_txns = sorted(sales, key=lambda t: t['transactionValue'], reverse=True)[:100]

    # --- Recent Transactions (latest 500 for feed) ---
    recent_txns = sorted(transactions, key=lambda t: t['date'], reverse=True)[:500]

    # --- Building Analytics (top 50 buildings by volume) ---
    bld_stats = defaultdict(lambda: {
        "count": 0, "value": 0, "psf_vals": [], "area": "", "areaId": "",
        "by_month": defaultdict(list), "dates": [], "txns": [],
    })

    for t in sales:
        bld = t['building']
        if not bld or bld == 'Unknown':
            continue
        b = bld_stats[bld]
        b["count"] += 1
        b["value"] += t['transactionValue']
        if t['priceSqft'] > 0:
            b["psf_vals"].append(t['priceSqft'])
        b["area"] = t['area']
        b["areaId"] = t['areaId']
        b["by_month"][t['date'][:7]].append(t['priceSqft'] if t['priceSqft'] > 0 else 0)
        b["dates"].append(t['date'])
        b["txns"].append(t)

    top_buildings = sorted(bld_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:50]

    building_analytics = []
    for bld_name, stats in top_buildings:
        avg_psf = sum(stats["psf_vals"]) / len(stats["psf_vals"]) if stats["psf_vals"] else 0
        area_avg = area_avg_psf.get(stats["area"], 0)
        price_vs_area = ((avg_psf / area_avg) - 1) * 100 if area_avg > 0 and avg_psf > 0 else 0

        # Monthly price trend
        months_sorted = sorted(stats["by_month"].keys())
        price_trend = []
        for m in months_sorted:
            vals = [v for v in stats["by_month"][m] if v > 0]
            price_trend.append(round(sum(vals) / len(vals)) if vals else 0)

        latest_txns = sorted(stats["txns"], key=lambda t: t['date'], reverse=True)[:5]

        building_analytics.append({
            "building": bld_name,
            "area": stats["area"],
            "areaId": stats["areaId"],
            "totalTransactions": stats["count"],
            "avgPriceSqft": round(avg_psf),
            "priceTrend": price_trend,
            "lastTransactionDate": max(stats["dates"]) if stats["dates"] else "",
            "lastTransactionPrice": latest_txns[0]['transactionValue'] if latest_txns else 0,
            "priceVsAreaAvg": round(price_vs_area, 1),
            "topBuyerNationalities": [],
            "recentTransactions": [
                {
                    "id": t["id"],
                    "date": t["date"],
                    "propertyType": t["propertyType"],
                    "bedrooms": t["bedrooms"],
                    "size": t["size"],
                    "price": t["transactionValue"],
                    "priceSqft": t["priceSqft"],
                }
                for t in latest_txns
            ],
        })

    # =========================================================================
    # PHASE 3: Build Area Profiles
    # =========================================================================
    area_profiles = []
    for area_name, stats in top_areas:
        area_id = slug(area_name)
        avg_psf = sum(stats["psf_vals"]) / len(stats["psf_vals"]) if stats["psf_vals"] else 0
        avg_size = sum(stats["sizes"]) / len(stats["sizes"]) if stats["sizes"] else 0
        avg_value = stats["value"] / stats["count"] if stats["count"] > 0 else 0

        # Monthly volume history
        months = sorted(stats["by_month"].keys())
        vol_history = [stats["by_month"].get(m, 0) for m in months]

        # Price history by month
        month_prices = defaultdict(list)
        for t in sales:
            if t['area'] == area_name and t['priceSqft'] > 0:
                month_prices[t['date'][:7]].append(t['priceSqft'])
        price_history = [round(sum(month_prices[m])/len(month_prices[m])) if month_prices[m] else 0 for m in months]

        # Price changes
        price_change_30d = 0
        price_change_90d = 0
        if len(price_history) >= 2 and price_history[-2] > 0:
            price_change_30d = round((price_history[-1] / price_history[-2] - 1) * 100, 1)
        if len(price_history) >= 3 and price_history[0] > 0:
            price_change_90d = round((price_history[-1] / price_history[0] - 1) * 100, 1)

        top_type = stats["by_type"].most_common(1)[0][0] if stats["by_type"] else "Apartment"

        offplan_pct = round(stats["offplan"] / stats["count"] * 100) if stats["count"] > 0 else 0

        # Demand score (composite: volume * price trend * diversity)
        vol_score = min(stats["count"] / 20, 40)  # up to 40 points for volume
        diversity = min(len(stats["projects"]) / 3, 30)  # up to 30 for project diversity
        price_score = max(0, min(30, 15 + price_change_90d))  # up to 30 for price growth
        demand_score = min(100, round(vol_score + diversity + price_score))

        demand_trend = 'stable'
        if len(vol_history) >= 2:
            if vol_history[-1] > vol_history[-2] * 1.1:
                demand_trend = 'rising'
            elif vol_history[-1] < vol_history[-2] * 0.9:
                demand_trend = 'falling'

        # MoM change
        mom = 0
        if len(months) >= 2:
            prev = stats["by_month"][months[-2]]
            curr = stats["by_month"][months[-1]]
            if prev > 0:
                mom = round((curr / prev - 1) * 100, 1)

        coord = AREA_COORDS.get(area_name, DEFAULT_COORD)

        # Recent area transactions
        area_txns = sorted(
            [t for t in sales if t['area'] == area_name],
            key=lambda t: t['date'], reverse=True
        )[:20]

        recent_area_txns = [{
            "id": t["id"], "date": t["date"], "propertyType": t["propertyType"],
            "bedrooms": t["bedrooms"], "size": t["size"], "price": t["transactionValue"],
            "priceSqft": t["priceSqft"], "building": t["building"],
            "isOffPlan": t["isOffPlan"], "buyerNationality": "N/A",
            "paymentType": t["paymentMethod"],
        } for t in area_txns]

        # Price breakdown by type
        type_prices = defaultdict(list)
        type_sizes = defaultdict(list)
        type_counts_area = Counter()
        for t in sales:
            if t['area'] == area_name and t['priceSqft'] > 0:
                type_prices[t['propertyType']].append(t['priceSqft'])
                if t['size'] > 0:
                    type_sizes[t['propertyType']].append(t['size'])
                type_counts_area[t['propertyType']] += 1

        price_breakdown = []
        for pt in type_counts_area.most_common():
            pt_name = pt[0]
            prices = type_prices[pt_name]
            sizes = type_sizes.get(pt_name, [0])
            price_breakdown.append({
                "propertyType": pt_name,
                "avgPriceSqft": round(sum(prices)/len(prices)) if prices else 0,
                "minPriceSqft": round(min(prices)) if prices else 0,
                "maxPriceSqft": round(max(prices)) if prices else 0,
                "avgSize": round(sum(sizes)/len(sizes)) if sizes else 0,
                "volume": pt[1],
            })

        # Inventory approximation by type
        active_inventory = []
        for pt_name, count in type_counts_area.most_common():
            prices_list = type_prices[pt_name]
            sizes_list = type_sizes.get(pt_name, [])
            avg_p = sum(prices_list)/len(prices_list) if prices_list else 0
            avg_s = sum(sizes_list)/len(sizes_list) if sizes_list else 0
            active_inventory.append({
                "propertyType": pt_name,
                "count": count,
                "avgPrice": round(avg_p * avg_s) if avg_p > 0 and avg_s > 0 else 0,
                "avgPriceSqft": round(avg_p),
                "avgSize": round(avg_s),
                "priceRange": {
                    "min": round(min(prices_list) * (min(sizes_list) if sizes_list else 1)) if prices_list else 0,
                    "max": round(max(prices_list) * (max(sizes_list) if sizes_list else 1)) if prices_list else 0,
                },
            })

        outlook = 'neutral'
        if price_change_90d > 5 and demand_score > 60:
            outlook = 'bullish'
        elif price_change_90d < -5 or demand_score < 30:
            outlook = 'bearish'

        area_profiles.append({
            "id": area_id,
            "name": area_name,
            "shortName": short_code(area_name),
            "coordinates": coord,
            "demandScore": demand_score,
            "demandTrend": demand_trend,
            "demandChange": mom,
            "avgPriceSqft": round(avg_psf),
            "priceChange30d": price_change_30d,
            "priceChange90d": price_change_90d,
            "priceChangeYoY": 0,
            "avgRentalYield": round(5 + (demand_score - 50) * 0.04, 1),  # estimate
            "totalInventory": stats["count"],
            "newListings30d": stats["by_month"].get(months[-1], 0) if months else 0,
            "transactionCount90d": stats["count"],
            "avgTransactionValue": round(avg_value),
            "topPropertyType": top_type,
            "topBuyerNationality": "N/A",
            "cashPercent": round((stats["count"] - stats["offplan"]) / stats["count"] * 100) if stats["count"] > 0 else 50,
            "priceHistory": price_history,
            "demandHistory": [demand_score] * len(months),
            "volumeHistory": vol_history,
            "yieldHistory": [round(5 + (demand_score - 50) * 0.04, 1)] * len(months),
            "description": f"Real market data: {stats['count']} transactions Q1 2026, avg AED {round(avg_psf)}/sqft, {len(stats['projects'])} active projects",
            "keyDrivers": [
                f"{stats['count']} transactions in Q1 2026",
                f"Average price AED {round(avg_psf)}/sqft",
                f"{offplan_pct}% off-plan activity",
                f"{len(stats['projects'])} active projects",
            ],
            "riskFactors": [],
            "outlook": outlook,
            "outlookReason": f"Based on {stats['count']} real DLD transactions Q1 2026",
            "subAreas": list(stats["projects"])[:10],
            "recentTransactions": recent_area_txns,
            "activeInventory": active_inventory,
            "priceBreakdown": price_breakdown,
            "buyerDemographics": [],
        })

    # =========================================================================
    # PHASE 4: Generate TypeScript files
    # =========================================================================

    def to_ts(obj, indent=2):
        """Convert Python object to TypeScript-compatible JSON"""
        return json.dumps(obj, indent=indent, ensure_ascii=False)

    # --- realTransactionData.ts ---
    print(f"Writing {TX_OUT}...")
    with open(TX_OUT, 'w', encoding='utf-8') as f:
        f.write("// ==========================================================================\n")
        f.write("// PCIS SCOUT - Real DLD Transaction Data (Q1 2026)\n")
        f.write("// Generated from dubailand.gov.ae open data export\n")
        f.write(f"// {len(transactions)} transactions | {len(set(t['area'] for t in transactions))} areas | Jan-Mar 2026\n")
        f.write("// ==========================================================================\n")
        f.write("// AUTO-GENERATED - DO NOT EDIT MANUALLY\n\n")
        f.write("import type { Transaction, VolumeByPeriod, VolumeByArea, VolumeByType,\n")
        f.write("  TransactionSummary, BuildingAnalytics } from './transactionData'\n\n")

        f.write(f"export const REAL_TRANSACTION_SUMMARY: TransactionSummary = {to_ts(summary)}\n\n")

        f.write(f"export const REAL_VOLUME_BY_MONTH: VolumeByPeriod[] = {to_ts(volume_by_month)}\n\n")

        f.write(f"export const REAL_VOLUME_BY_WEEK: VolumeByPeriod[] = {to_ts(volume_by_week)}\n\n")

        f.write(f"export const REAL_VOLUME_BY_AREA: VolumeByArea[] = {to_ts(volume_by_area)}\n\n")

        f.write(f"export const REAL_VOLUME_BY_TYPE: VolumeByType[] = {to_ts(volume_by_type)}\n\n")

        # Recent transactions (500 for feed)
        f.write(f"export const REAL_RECENT_TRANSACTIONS: Transaction[] = {to_ts(recent_txns)} as Transaction[]\n\n")

        # Top transactions (100 highest value)
        f.write(f"export const REAL_TOP_TRANSACTIONS: Transaction[] = {to_ts(top_txns)} as Transaction[]\n\n")

        # Building analytics
        # Clean up sets in building analytics (they've been converted already)
        clean_buildings = []
        for b in building_analytics:
            clean_b = dict(b)
            clean_b["topBuyerNationalities"] = []
            clean_b["transactions"] = clean_b.pop("recentTransactions", [])
            clean_buildings.append(clean_b)
        f.write(f"export const REAL_BUILDING_ANALYTICS: BuildingAnalytics[] = {to_ts(clean_buildings)} as BuildingAnalytics[]\n\n")

        # Area average prices lookup
        area_avg_export = {slug(a): round(v) for a, v in area_avg_psf.items()}
        f.write(f"export const REAL_AREA_AVG_PRICE_SQFT: Record<string, number> = {to_ts(area_avg_export)}\n\n")

        f.write(f"export const REAL_DATA_META = {to_ts({'source': 'Dubai Land Department Open Data', 'exportDate': '2026-03-26', 'dateRange': {'from': '2026-01-01', 'to': '2026-03-26'}, 'totalRecords': len(transactions), 'salesRecords': len(sales)})}\n")

    # --- realMarketData.ts ---
    print(f"Writing {MKT_OUT}...")
    with open(MKT_OUT, 'w', encoding='utf-8') as f:
        f.write("// ==========================================================================\n")
        f.write("// PCIS SCOUT - Real Market Data (Q1 2026)\n")
        f.write("// Generated from dubailand.gov.ae open data export\n")
        f.write(f"// {len(area_profiles)} area profiles computed from {len(sales)} sales\n")
        f.write("// ==========================================================================\n")
        f.write("// AUTO-GENERATED - DO NOT EDIT MANUALLY\n\n")
        f.write("import type { AreaProfile } from './marketData'\n\n")

        # Strip fields that don't exist on AreaProfile interface yet
        simplified_profiles = []
        for p in area_profiles:
            sp = dict(p)
            # Add missing required fields with defaults
            sp.setdefault("rental", {
                "avgRent": round(sp["avgPriceSqft"] * 0.06 * 1000 / 12),
                "avgYield": sp.get("avgRentalYield", 5.0),
                "rentChange": 0,
            })
            sp.setdefault("serviceCharges", {"avg": 15, "min": 10, "max": 25})
            sp.setdefault("supplyPipeline", [])
            sp.setdefault("liquidity", {"avgDaysOnMarket": 45, "absorptionRate": 0.7})
            sp.setdefault("regulatory", {"isFreehold": True})
            sp.setdefault("lifestyle", {"walkability": 65, "nearestBeach": "N/A", "nearestMall": "N/A"})
            sp.setdefault("community", {"population": 0, "avgAge": 35})
            sp.setdefault("priceTiers", [])
            sp.setdefault("seasonalPattern", {"peakMonths": [1, 2, 3], "troughMonths": [7, 8]})
            simplified_profiles.append(sp)

        f.write(f"export const REAL_AREA_PROFILES: AreaProfile[] = {to_ts(simplified_profiles)} as unknown as AreaProfile[]\n\n")

        # Area lookup map
        f.write("export const REAL_AREA_MAP: Record<string, AreaProfile> = Object.fromEntries(\n")
        f.write("  REAL_AREA_PROFILES.map(a => [a.id, a])\n")
        f.write(") as Record<string, AreaProfile>\n")

    print("Done! Generated real data files.")
    print(f"  {TX_OUT}: Transactions, volumes, buildings")
    print(f"  {MKT_OUT}: {len(area_profiles)} area profiles")


if __name__ == "__main__":
    main()
