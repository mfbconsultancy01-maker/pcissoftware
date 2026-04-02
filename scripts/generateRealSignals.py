#!/usr/bin/env python3
"""
Generate real Market Signals, Off-Plan Intelligence, and Property Intelligence
from existing PCIS real data (DLD transactions, rentals, projects, buildings).

Reads the TypeScript data files, extracts real numbers, computes signals.
Outputs: realSignalsData.ts, realOffPlanData.ts, realPropertyData_v2.ts
"""

import re
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

BASE = Path(__file__).parent.parent / "src" / "lib"

# ── Helpers ──────────────────────────────────────────────────────────────────

def extract_area_profiles(ts_text: str) -> list:
    """Extract area profile objects from realMarketData.ts"""
    areas = []
    # Find each area block
    pattern = r'\{\s*"id":\s*"([^"]+)".*?"name":\s*"([^"]+)".*?"shortName":\s*"([^"]+)".*?"demandScore":\s*(\d+).*?"demandTrend":\s*"([^"]+)".*?"demandChange":\s*([-\d.]+).*?"avgPriceSqft":\s*(\d+).*?"priceChange30d":\s*([-\d.]+).*?"priceChange90d":\s*([-\d.]+).*?"avgRentalYield":\s*([-\d.]+).*?"totalInventory":\s*(\d+).*?"transactionCount90d":\s*(\d+).*?"avgTransactionValue":\s*(\d+).*?"topPropertyType":\s*"([^"]+)".*?"cashPercent":\s*(\d+).*?"priceHistory":\s*\[([\d,\s]+)\].*?"volumeHistory":\s*\[([\d,\s]+)\].*?"outlook":\s*"([^"]+)"'

    # Simpler approach: just extract key fields line by line
    current = {}
    for line in ts_text.split('\n'):
        line = line.strip()
        if '"id":' in line:
            if current.get('id'):
                areas.append(current)
            current = {}
            m = re.search(r'"id":\s*"([^"]+)"', line)
            if m: current['id'] = m.group(1)
        for field, typ in [
            ('name', str), ('shortName', str), ('demandScore', int),
            ('demandTrend', str), ('demandChange', float),
            ('avgPriceSqft', int), ('priceChange30d', float),
            ('priceChange90d', float), ('avgRentalYield', float),
            ('totalInventory', int), ('transactionCount90d', int),
            ('avgTransactionValue', int), ('topPropertyType', str),
            ('cashPercent', int), ('outlook', str),
            ('newListings30d', int),
        ]:
            if f'"{field}":' in line:
                if typ == str:
                    m = re.search(rf'"{field}":\s*"([^"]*)"', line)
                    if m: current[field] = m.group(1)
                elif typ == int:
                    m = re.search(rf'"{field}":\s*(-?\d+)', line)
                    if m: current[field] = int(m.group(1))
                elif typ == float:
                    m = re.search(rf'"{field}":\s*([-\d.]+)', line)
                    if m: current[field] = float(m.group(1))
        # Extract price history array
        if '"priceHistory":' in line:
            m = re.search(r'\[([\d,\s]+)\]', line)
            if m:
                current['priceHistory'] = [int(x.strip()) for x in m.group(1).split(',') if x.strip()]
        if '"volumeHistory":' in line:
            m = re.search(r'\[([\d,\s]+)\]', line)
            if m:
                current['volumeHistory'] = [int(x.strip()) for x in m.group(1).split(',') if x.strip()]
    if current.get('id'):
        areas.append(current)
    return areas


def extract_supply_data(ts_text: str) -> list:
    """Extract project supply data from realProjectData.ts"""
    projects = []
    current = None
    in_projects = False

    for line in ts_text.split('\n'):
        line_s = line.strip()
        if '"areaName":' in line_s:
            if current:
                projects.append(current)
            current = {'projects': []}
            m = re.search(r'"areaName":\s*"([^"]*)"', line_s)
            if m: current['areaName'] = m.group(1)
        if current is None:
            continue
        for field, typ in [('areaId', str), ('projectCount', int), ('totalUnits', int), ('totalProjectValue', float)]:
            if f'"{field}":' in line_s:
                if typ == str:
                    m = re.search(rf'"{field}":\s*"([^"]*)"', line_s)
                    if m: current[field] = m.group(1)
                elif typ == int:
                    m = re.search(rf'"{field}":\s*(\d+)', line_s)
                    if m: current[field] = int(m.group(1))
                elif typ == float:
                    m = re.search(rf'"{field}":\s*([\d.e+]+)', line_s)
                    if m: current[field] = float(m.group(1))
        if '"name":' in line_s and '"developer":' not in line_s:
            # This might be a project name
            m = re.search(r'"name":\s*"([^"]*)"', line_s)
            if m and 'projects' in current:
                current['_current_project'] = {'name': m.group(1)}
        if '"developer":' in line_s and current.get('_current_project'):
            m = re.search(r'"developer":\s*"([^"]*)"', line_s)
            if m: current['_current_project']['developer'] = m.group(1)
        if '"totalUnits":' in line_s and current.get('_current_project'):
            m = re.search(r'"totalUnits":\s*(\d+)', line_s)
            if m: current['_current_project']['totalUnits'] = int(m.group(1))
        if '"status":' in line_s and current.get('_current_project'):
            m = re.search(r'"status":\s*"([^"]*)"', line_s)
            if m: current['_current_project']['status'] = m.group(1)
        if '"percentComplete":' in line_s and current.get('_current_project'):
            m = re.search(r'"percentComplete":\s*([\d.]+)', line_s)
            if m: current['_current_project']['percentComplete'] = float(m.group(1))
        if '"projectValue":' in line_s and current.get('_current_project'):
            m = re.search(r'"projectValue":\s*([\d.e+]+)', line_s)
            if m:
                current['_current_project']['projectValue'] = float(m.group(1))
                current['projects'].append(current['_current_project'])
                del current['_current_project']
    if current:
        projects.append(current)
    return projects


def extract_building_data(ts_text: str) -> list:
    """Extract building unit details from realBuildingData.ts"""
    buildings = []
    current = None
    in_room_mix = False

    for line in ts_text.split('\n'):
        line_s = line.strip()
        if '"name":' in line_s and '"areaDld":' not in line_s and current is None or ('"name":' in line_s and current and 'totalUnits' in current):
            if current and 'totalUnits' in current:
                buildings.append(current)
            current = {}
            m = re.search(r'"name":\s*"([^"]*)"', line_s)
            if m: current['name'] = m.group(1)
        if current is None:
            continue
        for field, typ in [('areaDld', str), ('areaPcis', str), ('totalUnits', int),
                           ('offplanPct', float), ('freeholdPct', float),
                           ('avgBuiltUpArea', int), ('primaryType', str)]:
            if f'"{field}":' in line_s:
                if typ == str:
                    m = re.search(rf'"{field}":\s*"([^"]*)"', line_s)
                    if m: current[field] = m.group(1)
                elif typ == int:
                    m = re.search(rf'"{field}":\s*(\d+)', line_s)
                    if m: current[field] = int(m.group(1))
                elif typ == float:
                    m = re.search(rf'"{field}":\s*([\d.]+)', line_s)
                    if m: current[field] = float(m.group(1))
    if current and 'totalUnits' in current:
        buildings.append(current)
    return buildings


# ── Signal Generation ────────────────────────────────────────────────────────

def generate_signals(areas: list) -> tuple:
    """Generate market signals from real area data"""
    signals = []
    opportunities = []
    emerging = []
    heat_metrics = []
    sig_id = 1
    opp_id = 1
    now = datetime(2026, 3, 26)

    for area in areas:
        aid = area.get('id', '')
        name = area.get('name', '')
        short = area.get('shortName', name[:6])
        price = area.get('avgPriceSqft', 0)
        p30 = area.get('priceChange30d', 0)
        p90 = area.get('priceChange90d', 0)
        demand = area.get('demandScore', 50)
        demand_chg = area.get('demandChange', 0)
        yld = area.get('avgRentalYield', 0)
        txn_count = area.get('transactionCount90d', 0)
        avg_txn = area.get('avgTransactionValue', 0)
        cash_pct = area.get('cashPercent', 50)
        outlook = area.get('outlook', 'neutral')
        vol_hist = area.get('volumeHistory', [])
        price_hist = area.get('priceHistory', [])
        new_listings = area.get('newListings30d', 0)

        if price == 0 or txn_count == 0:
            continue

        # ── Price Drop Signal ──
        if p30 < -3:
            severity = 'critical' if p30 < -10 else 'high' if p30 < -5 else 'medium'
            signals.append({
                'id': f'SIG-{sig_id:03d}',
                'type': 'price-drop',
                'severity': severity,
                'title': f'{name} Price Decline {abs(p30):.1f}% in 30 Days',
                'description': f'{name} avg price/sqft dropped from AED {int(price/(1+p30/100)):,} to AED {price:,}, a {abs(p30):.1f}% decline over 30 days based on {txn_count} DLD transactions.',
                'area': name,
                'areaId': aid,
                'detectedDate': (now - timedelta(days=2)).isoformat() + 'Z',
                'expiresDate': (now + timedelta(days=14)).isoformat() + 'Z',
                'isActive': True,
                'confidence': min(95, 60 + txn_count // 20),
                'triggerMetric': 'Avg Price/Sqft 30-Day Change',
                'triggerValue': price,
                'baselineValue': int(price / (1 + p30/100)),
                'deviationPct': round(p30, 1),
                'actionableInsight': f'Entry opportunity in {name}. Price weakness on {txn_count} transactions suggests potential value play for clients targeting this area.',
                'targetClients': ['Value Investors', 'End Users'],
                'estimatedUpside': int(abs(p30) / 100 * avg_txn * 2),
                'timeToAct': '1 week' if abs(p30) > 5 else '2 weeks',
                'tags': ['Price Decline', 'Value Play', name]
            })
            sig_ref = f'SIG-{sig_id:03d}'
            sig_id += 1

            # Corresponding opportunity
            opportunities.append({
                'id': f'OPP-{opp_id:03d}',
                'signalId': sig_ref,
                'type': 'buy',
                'title': f'{name} Value Entry',
                'area': name,
                'areaId': aid,
                'propertyType': area.get('topPropertyType', 'Mixed'),
                'currentPrice': price,
                'targetPrice': int(price / (1 + p30/100)),
                'upside': round(abs(p30), 1),
                'confidence': min(90, 60 + txn_count // 25),
                'timeHorizon': '6 months',
                'rationale': f'Price declined {abs(p30):.1f}% on {txn_count} transactions. Historical mean reversion expected.',
                'risks': ['Continued price pressure', 'Supply overhang', 'Market sentiment'],
                'clientFit': ['Value Investors', 'Opportunistic Buyers'],
                'status': 'active',
                'createdDate': (now - timedelta(days=2)).isoformat() + 'Z'
            })
            opp_id += 1

        # ── Price Surge Signal ──
        if p30 > 5:
            severity = 'high' if p30 > 10 else 'medium'
            signals.append({
                'id': f'SIG-{sig_id:03d}',
                'type': 'momentum-shift',
                'severity': severity,
                'title': f'{name} Price Surge +{p30:.1f}% in 30 Days',
                'description': f'{name} showing strong price momentum with {p30:.1f}% gain in 30 days across {txn_count} DLD transactions. Avg price now AED {price:,}/sqft.',
                'area': name,
                'areaId': aid,
                'detectedDate': (now - timedelta(days=1)).isoformat() + 'Z',
                'isActive': True,
                'confidence': min(92, 55 + txn_count // 15),
                'triggerMetric': 'Avg Price/Sqft 30-Day Change',
                'triggerValue': price,
                'baselineValue': int(price / (1 + p30/100)),
                'deviationPct': round(p30, 1),
                'actionableInsight': f'Strong momentum in {name}. Existing holders should consider holding; new buyers face elevated entry. Monitor for sustainability.',
                'targetClients': ['Existing Holders', 'Momentum Traders'],
                'timeToAct': '1 week',
                'tags': ['Price Surge', 'Momentum', name]
            })
            sig_id += 1

        # ── Volume Spike Signal ──
        if len(vol_hist) >= 2 and vol_hist[-2] > 0:
            vol_change = ((vol_hist[-1] / vol_hist[-2]) - 1) * 100
            if vol_change > 20:
                signals.append({
                    'id': f'SIG-{sig_id:03d}',
                    'type': 'volume-spike',
                    'severity': 'high' if vol_change > 50 else 'medium',
                    'title': f'{name} Transaction Volume Surge +{vol_change:.0f}%',
                    'description': f'Transaction volume jumped from {vol_hist[-2]} to {vol_hist[-1]} in {name}, a {vol_change:.0f}% increase indicating heightened market activity.',
                    'area': name,
                    'areaId': aid,
                    'detectedDate': (now - timedelta(days=3)).isoformat() + 'Z',
                    'isActive': True,
                    'confidence': min(88, 50 + txn_count // 20),
                    'triggerMetric': 'Monthly Transaction Volume',
                    'triggerValue': vol_hist[-1],
                    'baselineValue': vol_hist[-2],
                    'deviationPct': round(vol_change, 1),
                    'actionableInsight': f'Accelerating demand in {name}. Volume spike often precedes price moves. Alert relevant clients.',
                    'targetClients': ['Active Buyers', 'Developers'],
                    'timeToAct': '48 hours',
                    'tags': ['Volume Spike', 'Demand Signal', name]
                })
                sig_id += 1
            elif vol_change < -30:
                signals.append({
                    'id': f'SIG-{sig_id:03d}',
                    'type': 'volume-spike',
                    'severity': 'medium',
                    'title': f'{name} Volume Drop {vol_change:.0f}%',
                    'description': f'Transaction volume fell from {vol_hist[-2]} to {vol_hist[-1]} in {name}, a {abs(vol_change):.0f}% decline signaling cooling activity.',
                    'area': name,
                    'areaId': aid,
                    'detectedDate': (now - timedelta(days=3)).isoformat() + 'Z',
                    'isActive': True,
                    'confidence': min(80, 45 + txn_count // 25),
                    'triggerMetric': 'Monthly Transaction Volume',
                    'triggerValue': vol_hist[-1],
                    'baselineValue': vol_hist[-2],
                    'deviationPct': round(vol_change, 1),
                    'actionableInsight': f'Cooling activity in {name}. Volume decline may signal buyer hesitancy. Monitor for price adjustment.',
                    'targetClients': ['Current Sellers', 'Portfolio Managers'],
                    'timeToAct': '1 week',
                    'tags': ['Volume Decline', 'Cooling', name]
                })
                sig_id += 1

        # ── Yield Signal ──
        if yld > 7:
            signals.append({
                'id': f'SIG-{sig_id:03d}',
                'type': 'yield-shift',
                'severity': 'high',
                'title': f'{name} High Rental Yield {yld:.1f}%',
                'description': f'{name} offering {yld:.1f}% gross rental yield at AED {price:,}/sqft — significantly above Dubai average of 5.5%. Income opportunity.',
                'area': name,
                'areaId': aid,
                'detectedDate': (now - timedelta(days=5)).isoformat() + 'Z',
                'isActive': True,
                'confidence': min(90, 65 + txn_count // 30),
                'triggerMetric': 'Gross Rental Yield',
                'triggerValue': yld,
                'baselineValue': 5.5,
                'deviationPct': round(((yld / 5.5) - 1) * 100, 1),
                'actionableInsight': f'Above-market yield in {name}. Attractive for income-focused investors and portfolio builders. {cash_pct}% cash buyers suggests strong conviction.',
                'targetClients': ['Income Investors', 'Portfolio Builders'],
                'estimatedUpside': int(avg_txn * yld / 100),
                'timeToAct': '2 weeks',
                'tags': ['High Yield', 'Income Play', name]
            })
            sig_id += 1

        # ── Demand Surge ──
        if demand >= 85 and demand_chg > 0:
            signals.append({
                'id': f'SIG-{sig_id:03d}',
                'type': 'demand-surge',
                'severity': 'high' if demand >= 90 else 'medium',
                'title': f'{name} Demand Score {demand}/100',
                'description': f'{name} recording exceptional demand with score {demand}/100 based on {txn_count} transactions. Top property type: {area.get("topPropertyType", "Mixed")}.',
                'area': name,
                'areaId': aid,
                'detectedDate': (now - timedelta(days=1)).isoformat() + 'Z',
                'isActive': True,
                'confidence': min(93, 60 + demand // 5),
                'triggerMetric': 'Demand Score',
                'triggerValue': demand,
                'baselineValue': 50,
                'deviationPct': round(((demand / 50) - 1) * 100, 1),
                'actionableInsight': f'Exceptional demand in {name}. {txn_count} transactions Q1 confirm strong buyer appetite. Listings will move quickly.',
                'targetClients': ['Active Sellers', 'Developers'],
                'timeToAct': 'Ongoing',
                'tags': ['High Demand', 'Hot Market', name]
            })
            sig_id += 1

        # ── Demand Decline (falling demand) ──
        if demand_chg < -20:
            signals.append({
                'id': f'SIG-{sig_id:03d}',
                'type': 'demand-surge',
                'severity': 'medium',
                'title': f'{name} Demand Declining {demand_chg:.0f}%',
                'description': f'{name} demand change of {demand_chg:.1f}% despite {txn_count} transactions. Score still {demand}/100 but momentum is shifting.',
                'area': name,
                'areaId': aid,
                'detectedDate': (now - timedelta(days=4)).isoformat() + 'Z',
                'isActive': True,
                'confidence': min(80, 50 + txn_count // 30),
                'triggerMetric': 'Demand Change',
                'triggerValue': demand_chg,
                'baselineValue': 0,
                'deviationPct': round(demand_chg, 1),
                'actionableInsight': f'Demand softening in {name}. Current sellers should price competitively. Buyers may find negotiation room.',
                'targetClients': ['Negotiators', 'Value Buyers'],
                'timeToAct': '2 weeks',
                'tags': ['Demand Decline', 'Buyer Market', name]
            })
            sig_id += 1

        # ── Supply Pressure (high new listings vs transactions) ──
        if new_listings > 0 and txn_count > 0:
            absorption = txn_count / max(1, new_listings) if new_listings > 0 else 999
            if absorption < 1.5 and new_listings > 200:
                signals.append({
                    'id': f'SIG-{sig_id:03d}',
                    'type': 'supply-shock',
                    'severity': 'medium',
                    'title': f'{name} Supply Pressure — {new_listings} New Listings',
                    'description': f'{name} has {new_listings} new listings vs {txn_count} transactions Q1. Absorption ratio {absorption:.1f}x signals potential supply overhang.',
                    'area': name,
                    'areaId': aid,
                    'detectedDate': (now - timedelta(days=6)).isoformat() + 'Z',
                    'isActive': True,
                    'confidence': min(82, 50 + new_listings // 50),
                    'triggerMetric': 'New Listings to Transaction Ratio',
                    'triggerValue': new_listings,
                    'baselineValue': txn_count,
                    'deviationPct': round((1 - absorption) * 100, 1),
                    'actionableInsight': f'Supply building in {name}. Sellers face competition from {new_listings} listings. Price discipline required.',
                    'targetClients': ['Current Sellers', 'Portfolio Managers'],
                    'timeToAct': '1 month',
                    'tags': ['Supply Pressure', 'Absorption Watch', name]
                })
                sig_id += 1

        # ── Arbitrage: Off-plan to resale gap ──
        if cash_pct < 45 and p90 > 5:
            signals.append({
                'id': f'SIG-{sig_id:03d}',
                'type': 'arbitrage',
                'severity': 'medium',
                'title': f'{name} Off-Plan Arbitrage Window',
                'description': f'{name} showing {p90:.1f}% 90-day appreciation with {100-cash_pct}% mortgage-backed transactions. Off-plan entry at developer pricing may yield arbitrage on completion.',
                'area': name,
                'areaId': aid,
                'detectedDate': (now - timedelta(days=7)).isoformat() + 'Z',
                'isActive': True,
                'confidence': min(78, 50 + int(p90 * 3)),
                'triggerMetric': '90-Day Price Appreciation',
                'triggerValue': p90,
                'baselineValue': 0,
                'deviationPct': round(p90, 1),
                'actionableInsight': f'Price momentum + off-plan availability in {name} creates potential arbitrage. Acquire developer stock, hold through appreciation cycle.',
                'targetClients': ['Arbitrage Traders', 'Short-Term Investors'],
                'timeToAct': '2 weeks',
                'tags': ['Arbitrage', 'Off-Plan Gap', name]
            })
            sig_id += 1

        # ── Heat Metrics ──
        price_heat = min(100, max(0, int(50 + p30 * 5)))
        volume_heat = min(100, max(0, int(demand * 0.8 + (demand_chg if demand_chg > 0 else 0) * 0.3)))
        demand_heat = min(100, max(0, demand))
        supply_heat = min(100, max(0, int(100 - (new_listings / max(1, txn_count / 3)) * 20))) if txn_count > 0 else 50
        yield_heat = min(100, max(0, int(yld * 13)))
        sentiment_heat = min(100, max(0, int(60 + p30 * 2 + (10 if outlook == 'bullish' else -5 if outlook == 'bearish' else 0))))
        overall = int(price_heat * 0.25 + volume_heat * 0.2 + demand_heat * 0.2 + supply_heat * 0.1 + yield_heat * 0.1 + sentiment_heat * 0.15)

        if demand_chg > 5:
            trend = 'heating'
        elif demand_chg < -10:
            trend = 'cooling'
        else:
            trend = 'stable'

        heat_metrics.append({
            'areaId': aid,
            'area': name,
            'shortName': short,
            'priceHeat': price_heat,
            'volumeHeat': volume_heat,
            'demandHeat': demand_heat,
            'supplyHeat': supply_heat,
            'yieldHeat': yield_heat,
            'sentimentHeat': sentiment_heat,
            'overallHeat': overall,
            'heatTrend': trend,
            'heatChange30d': int(p30 * 2 + demand_chg * 0.3)
        })

        # ── Emerging Area Signals ──
        if price < 1500 and txn_count > 50:
            phase = 'discovery' if price < 1000 else 'early-growth'
            comparable_price = 3000  # Dubai average premium
            emerging.append({
                'areaId': aid,
                'area': name,
                'emergingScore': min(90, max(30, int(100 - price / 30))),
                'phase': phase,
                'currentPriceSqft': price,
                'comparableAreaPrice': comparable_price,
                'priceGap': round(((price / comparable_price) - 1) * 100),
                'catalysts': [
                    f'{txn_count} transactions Q1 2026 showing market activation',
                    f'Avg price AED {price}/sqft — significant upside to Dubai avg',
                    f'{yld:.1f}% rental yield attracts income investors',
                ],
                'risks': [
                    'Infrastructure may lag demand',
                    'Extended absorption timeline',
                    'Market sentiment sensitivity',
                ],
                'infrastructure': [],
                'demandDrivers': [
                    f'Affordable entry at AED {price}/sqft',
                    f'{cash_pct}% cash buyers signal conviction',
                    f'{area.get("topPropertyType", "Mixed")} demand',
                ],
                'priceHistory': price_hist or [price],
                'volumeHistory': vol_hist or [txn_count],
                'priceVelocity': round(p30 / 3, 1) if p30 else 0,
                'volumeVelocity': round(demand_chg / 10, 1) if demand_chg else 0,
                'projectedAppreciation12m': max(5, min(60, int(abs((comparable_price - price) / comparable_price * 30)))),
                'comparableArea': 'Downtown Dubai'
            })

    return signals, opportunities, emerging, heat_metrics


def generate_market_pulse(signals: list, areas: list) -> dict:
    """Generate market pulse summary from real signals"""
    total_txn = sum(a.get('transactionCount90d', 0) for a in areas)
    total_value = sum(a.get('avgTransactionValue', 0) * a.get('transactionCount90d', 0) for a in areas)
    avg_price = int(sum(a.get('avgPriceSqft', 0) for a in areas if a.get('avgPriceSqft', 0) > 0) / max(1, len([a for a in areas if a.get('avgPriceSqft', 0) > 0])))

    bullish_count = sum(1 for a in areas if a.get('outlook') == 'bullish')
    bearish_count = sum(1 for a in areas if a.get('outlook') == 'bearish')

    if bullish_count > bearish_count * 2:
        sentiment = 'bullish'
    elif bearish_count > bullish_count * 2:
        sentiment = 'bearish'
    else:
        sentiment = 'neutral'

    critical = sum(1 for s in signals if s['severity'] == 'critical')
    avg_change = sum(a.get('priceChange30d', 0) for a in areas) / max(1, len(areas))

    return {
        'date': '2026-03-26T17:30:00Z',
        'overallSentiment': sentiment,
        'sentimentScore': min(100, max(0, int(50 + avg_change * 5 + (bullish_count - bearish_count) * 3))),
        'activeSignals': len(signals),
        'criticalSignals': critical,
        'topSignal': signals[0]['title'] if signals else 'No active signals',
        'marketMomentum': int(avg_change * 8),
        'buyerActivity': 'high' if total_txn > 30000 else 'medium' if total_txn > 15000 else 'low',
        'sellerActivity': 'medium',
        'priceDirection': 'up' if avg_change > 1 else 'down' if avg_change < -1 else 'flat',
        'volumeDirection': 'up' if total_txn > 40000 else 'flat',
        'transactionsToday': int(total_txn / 90),
        'totalValueToday': int(total_value / 90),
        'avgPriceSqftToday': avg_price,
        'weeklyMomentum': [int(avg_change * 6 + i * 0.5) for i in range(-6, 6)],
        'weeklySentiment': [min(100, max(0, int(50 + avg_change * 4 + i))) for i in range(-6, 6)]
    }


def generate_signals_summary(signals: list, opportunities: list, emerging: list, heat_metrics: list) -> dict:
    from collections import Counter
    type_counts = Counter(s['type'] for s in signals)
    sev_counts = Counter(s['severity'] for s in signals)

    hottest = max(heat_metrics, key=lambda h: h['overallHeat']) if heat_metrics else {'area': 'N/A'}
    coolest = min(heat_metrics, key=lambda h: h['overallHeat']) if heat_metrics else {'area': 'N/A'}

    total_upside = sum(s.get('estimatedUpside', 0) for s in signals)

    return {
        'totalActiveSignals': len(signals),
        'criticalCount': sev_counts.get('critical', 0),
        'highCount': sev_counts.get('high', 0),
        'mediumCount': sev_counts.get('medium', 0),
        'lowCount': sev_counts.get('low', 0),
        'activeOpportunities': len(opportunities),
        'totalEstimatedUpside': total_upside,
        'emergingAreas': len(emerging),
        'hottestArea': hottest['area'],
        'coolestArea': coolest['area'],
        'signalsByType': [{'type': t, 'count': c} for t, c in type_counts.items()]
    }


# ── Off-Plan Generator ───────────────────────────────────────────────────────

def generate_offplan(supply_data: list, building_data: list, areas: list) -> tuple:
    """Generate real off-plan data from project supply + building registration data"""

    # Build area price lookup
    area_prices = {}
    for a in areas:
        area_prices[a.get('name', '').upper()] = a.get('avgPriceSqft', 0)
        area_prices[a.get('id', '')] = a.get('avgPriceSqft', 0)

    # Build developer project counts from supply data
    dev_projects = {}
    for sd in supply_data:
        for p in sd.get('projects', []):
            dev = p.get('developer', 'Unknown')
            if dev not in dev_projects:
                dev_projects[dev] = {'count': 0, 'totalUnits': 0, 'areas': set(), 'projects': []}
            dev_projects[dev]['count'] += 1
            dev_projects[dev]['totalUnits'] += p.get('totalUnits', 0)
            dev_projects[dev]['areas'].add(sd.get('areaName', ''))
            dev_projects[dev]['projects'].append(p.get('name', ''))

    # Generate developers list
    developers = []
    dev_id_map = {}
    for i, (dev_name, info) in enumerate(sorted(dev_projects.items(), key=lambda x: -x[1]['totalUnits'])):
        did = ''.join(w[0] for w in dev_name.split()[:3]).upper()[:3]
        if len(did) < 2:
            did = dev_name[:3].upper()
        dev_id_map[dev_name] = did
        developers.append({
            'id': did,
            'name': dev_name,
            'shortName': did,
            'totalProjectsActive': info['count'],
            'totalUnitsActive': info['totalUnits'],
            'areas': sorted(info['areas']),
            'projectNames': info['projects'][:10],
        })

    # Generate off-plan projects from supply pipeline
    offplan_projects = []
    proj_id = 1
    for sd in supply_data:
        area_name = sd.get('areaName', '')
        area_id = sd.get('areaId', '')
        area_price = 0
        # Try to find matching area price
        for a in areas:
            if a.get('id', '') == area_id or a.get('name', '').upper() == area_name.upper():
                area_price = a.get('avgPriceSqft', 0)
                break

        for p in sd.get('projects', []):
            dev = p.get('developer', 'Unknown')
            dev_id = dev_id_map.get(dev, 'UNK')
            pct = p.get('percentComplete', 0)

            if pct >= 100:
                status = 'Completed'
            elif pct >= 75:
                status = 'Near Completion'
            elif pct > 0:
                status = 'Under Construction'
            else:
                status = 'Launched'

            units = p.get('totalUnits', 0)
            value = p.get('projectValue', 0)
            avg_unit_price = int(value / units) if units > 0 else 0

            offplan_projects.append({
                'id': f'RP-{proj_id:03d}',
                'projectName': p.get('name', ''),
                'developer': dev,
                'developerId': dev_id,
                'area': area_name,
                'areaId': area_id,
                'status': status,
                'completionPct': pct,
                'totalUnits': units,
                'projectValue': value,
                'avgUnitPrice': avg_unit_price,
                'areaAvgPriceSqft': area_price,
            })
            proj_id += 1

    # Generate summary
    total_units = sum(p['totalUnits'] for p in offplan_projects)
    total_value = sum(p['projectValue'] for p in offplan_projects)
    top_dev = developers[0]['name'] if developers else 'N/A'

    summary = {
        'totalActiveProjects': len(offplan_projects),
        'totalUnits': total_units,
        'totalPipelineValue': total_value,
        'topDeveloper': top_dev,
        'totalDevelopers': len(developers),
    }

    return developers, offplan_projects, summary


# ── Property Intelligence Generator ─────────────────────────────────────────

def generate_properties(areas: list) -> list:
    """Generate real property intelligence profiles from top transaction areas"""
    properties = []
    prop_id = 1

    # Sort by transaction count — top areas
    sorted_areas = sorted(areas, key=lambda a: a.get('transactionCount90d', 0), reverse=True)

    for area in sorted_areas[:20]:  # Top 20 areas
        name = area.get('name', '')
        price = area.get('avgPriceSqft', 0)
        yld = area.get('avgRentalYield', 0)
        txn = area.get('transactionCount90d', 0)
        avg_val = area.get('avgTransactionValue', 0)
        p30 = area.get('priceChange30d', 0)
        p90 = area.get('priceChange90d', 0)
        cash = area.get('cashPercent', 50)
        prop_type = area.get('topPropertyType', 'Mixed')
        demand = area.get('demandScore', 50)
        outlook = area.get('outlook', 'neutral')

        properties.append({
            'id': f'PROP-{prop_id:03d}',
            'area': name,
            'areaId': area.get('id', ''),
            'propertyType': prop_type,
            'avgPriceSqft': price,
            'avgTransactionValue': avg_val,
            'priceChange30d': p30,
            'priceChange90d': p90,
            'rentalYield': yld,
            'transactionCount': txn,
            'cashPct': cash,
            'demandScore': demand,
            'outlook': outlook,
            'investmentProfile': {
                'yieldRating': 'Strong' if yld > 6.5 else 'Moderate' if yld > 4.5 else 'Low',
                'capitalGrowth': 'Accelerating' if p90 > 5 else 'Stable' if p90 > -2 else 'Declining',
                'liquidity': 'High' if txn > 1000 else 'Medium' if txn > 200 else 'Low',
                'riskLevel': 'Low' if demand > 80 and cash > 40 else 'Medium' if demand > 50 else 'High',
            }
        })
        prop_id += 1

    return properties


# ── Output ───────────────────────────────────────────────────────────────────

def write_signals_ts(signals, opportunities, emerging, heat_metrics, pulse, summary, outpath):
    """Write realSignalsData.ts"""
    lines = []
    lines.append('// ==========================================================================')
    lines.append('// PCIS SCOUT - Real Market Signals (Q1 2026)')
    lines.append('// Auto-generated from DLD transaction data (45,628 sales)')
    lines.append('// ==========================================================================')
    lines.append('// AUTO-GENERATED - DO NOT EDIT MANUALLY')
    lines.append('')
    lines.append('import type { MarketSignal, Opportunity, EmergingAreaSignal, AreaHeatMetric, MarketPulse, SignalsSummary } from \'./signalsData\'')
    lines.append('')

    lines.append(f'export const REAL_MARKET_SIGNALS: MarketSignal[] = {json.dumps(signals, indent=2)}')
    lines.append('')
    lines.append(f'export const REAL_OPPORTUNITIES: Opportunity[] = {json.dumps(opportunities, indent=2)}')
    lines.append('')
    lines.append(f'export const REAL_EMERGING_AREAS: EmergingAreaSignal[] = {json.dumps(emerging, indent=2)}')
    lines.append('')
    lines.append(f'export const REAL_HEAT_METRICS: AreaHeatMetric[] = {json.dumps(heat_metrics, indent=2)}')
    lines.append('')
    lines.append(f'export const REAL_MARKET_PULSE: MarketPulse = {json.dumps(pulse, indent=2)}')
    lines.append('')
    lines.append(f'export const REAL_SIGNALS_SUMMARY: SignalsSummary = {json.dumps(summary, indent=2)}')
    lines.append('')

    with open(outpath, 'w') as f:
        f.write('\n'.join(lines))
    print(f'  Written {outpath} ({len(signals)} signals, {len(opportunities)} opportunities, {len(emerging)} emerging, {len(heat_metrics)} heat metrics)')


def write_offplan_ts(developers, projects, summary, outpath):
    """Write realOffPlanData.ts"""
    lines = []
    lines.append('// ==========================================================================')
    lines.append('// PCIS SCOUT - Real Off-Plan Intelligence (Q1 2026)')
    lines.append('// Auto-generated from DLD project registration data (153 projects)')
    lines.append('// ==========================================================================')
    lines.append('// AUTO-GENERATED - DO NOT EDIT MANUALLY')
    lines.append('')

    # Simplified developer type for real data
    lines.append('export interface RealDeveloper {')
    lines.append('  id: string')
    lines.append('  name: string')
    lines.append('  shortName: string')
    lines.append('  totalProjectsActive: number')
    lines.append('  totalUnitsActive: number')
    lines.append('  areas: string[]')
    lines.append('  projectNames: string[]')
    lines.append('}')
    lines.append('')

    lines.append('export interface RealOffPlanProject {')
    lines.append('  id: string')
    lines.append('  projectName: string')
    lines.append('  developer: string')
    lines.append('  developerId: string')
    lines.append('  area: string')
    lines.append('  areaId: string')
    lines.append('  status: string')
    lines.append('  completionPct: number')
    lines.append('  totalUnits: number')
    lines.append('  projectValue: number')
    lines.append('  avgUnitPrice: number')
    lines.append('  areaAvgPriceSqft: number')
    lines.append('}')
    lines.append('')

    lines.append('export interface RealOffPlanSummary {')
    lines.append('  totalActiveProjects: number')
    lines.append('  totalUnits: number')
    lines.append('  totalPipelineValue: number')
    lines.append('  topDeveloper: string')
    lines.append('  totalDevelopers: number')
    lines.append('}')
    lines.append('')

    lines.append(f'export const REAL_DEVELOPERS: RealDeveloper[] = {json.dumps(developers, indent=2, default=list)}')
    lines.append('')
    lines.append(f'export const REAL_OFFPLAN_PROJECTS: RealOffPlanProject[] = {json.dumps(projects, indent=2)}')
    lines.append('')
    lines.append(f'export const REAL_OFFPLAN_SUMMARY: RealOffPlanSummary = {json.dumps(summary, indent=2)}')
    lines.append('')

    # Helper functions
    lines.append('export function getRealProject(id: string): RealOffPlanProject | undefined {')
    lines.append('  return REAL_OFFPLAN_PROJECTS.find(p => p.id === id)')
    lines.append('}')
    lines.append('')
    lines.append('export function getRealProjectsByArea(areaId: string): RealOffPlanProject[] {')
    lines.append('  return REAL_OFFPLAN_PROJECTS.filter(p => p.areaId === areaId)')
    lines.append('}')
    lines.append('')
    lines.append('export function getRealProjectsByDeveloper(devId: string): RealOffPlanProject[] {')
    lines.append('  return REAL_OFFPLAN_PROJECTS.filter(p => p.developerId === devId)')
    lines.append('}')
    lines.append('')
    lines.append('export function getRealDeveloper(id: string): RealDeveloper | undefined {')
    lines.append('  return REAL_DEVELOPERS.find(d => d.id === id)')
    lines.append('}')
    lines.append('')

    with open(outpath, 'w') as f:
        f.write('\n'.join(lines))
    print(f'  Written {outpath} ({len(developers)} developers, {len(projects)} projects)')


def write_properties_ts(properties, outpath):
    """Write realPropertyIntel.ts"""
    lines = []
    lines.append('// ==========================================================================')
    lines.append('// PCIS SCOUT - Real Property Intelligence (Q1 2026)')
    lines.append('// Auto-generated from DLD transaction data')
    lines.append('// ==========================================================================')
    lines.append('// AUTO-GENERATED - DO NOT EDIT MANUALLY')
    lines.append('')

    lines.append('export interface PropertyIntelProfile {')
    lines.append('  id: string')
    lines.append('  area: string')
    lines.append('  areaId: string')
    lines.append('  propertyType: string')
    lines.append('  avgPriceSqft: number')
    lines.append('  avgTransactionValue: number')
    lines.append('  priceChange30d: number')
    lines.append('  priceChange90d: number')
    lines.append('  rentalYield: number')
    lines.append('  transactionCount: number')
    lines.append('  cashPct: number')
    lines.append('  demandScore: number')
    lines.append('  outlook: string')
    lines.append('  investmentProfile: {')
    lines.append('    yieldRating: string')
    lines.append('    capitalGrowth: string')
    lines.append('    liquidity: string')
    lines.append('    riskLevel: string')
    lines.append('  }')
    lines.append('}')
    lines.append('')

    lines.append(f'export const REAL_PROPERTY_INTEL: PropertyIntelProfile[] = {json.dumps(properties, indent=2)}')
    lines.append('')

    lines.append('export function getPropertyIntel(areaId: string): PropertyIntelProfile | undefined {')
    lines.append('  return REAL_PROPERTY_INTEL.find(p => p.areaId === areaId)')
    lines.append('}')
    lines.append('')
    lines.append('export function getTopProperties(count: number = 10): PropertyIntelProfile[] {')
    lines.append('  return REAL_PROPERTY_INTEL.slice(0, count)')
    lines.append('}')
    lines.append('')

    with open(outpath, 'w') as f:
        f.write('\n'.join(lines))
    print(f'  Written {outpath} ({len(properties)} property profiles)')


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print('PCIS Real Data Generator')
    print('=' * 60)

    # Read source data
    print('\n1. Reading real market data...')
    market_text = (BASE / 'realMarketData.ts').read_text()
    areas = extract_area_profiles(market_text)
    print(f'   Extracted {len(areas)} area profiles')

    print('\n2. Reading real project data...')
    project_text = (BASE / 'realProjectData.ts').read_text()
    supply = extract_supply_data(project_text)
    print(f'   Extracted {len(supply)} area supply entries')

    print('\n3. Reading real building data...')
    building_text = (BASE / 'realBuildingData.ts').read_text()
    buildings = extract_building_data(building_text)
    print(f'   Extracted {len(buildings)} building records')

    # Generate signals
    print('\n4. Generating market signals...')
    signals, opportunities, emerging, heat_metrics = generate_signals(areas)
    pulse = generate_market_pulse(signals, areas)
    summary = generate_signals_summary(signals, opportunities, emerging, heat_metrics)
    print(f'   Generated {len(signals)} signals, {len(opportunities)} opportunities, {len(emerging)} emerging areas, {len(heat_metrics)} heat metrics')

    # Generate off-plan
    print('\n5. Generating off-plan intelligence...')
    developers, offplan_projects, offplan_summary = generate_offplan(supply, buildings, areas)
    print(f'   Generated {len(developers)} developers, {len(offplan_projects)} projects')

    # Generate properties
    print('\n6. Generating property intelligence...')
    properties = generate_properties(areas)
    print(f'   Generated {len(properties)} property profiles')

    # Write output files
    print('\n7. Writing output files...')
    write_signals_ts(signals, opportunities, emerging, heat_metrics, pulse, summary, BASE / 'realSignalsData.ts')
    write_offplan_ts(developers, offplan_projects, offplan_summary, BASE / 'realOffPlanData.ts')
    write_properties_ts(properties, BASE / 'realPropertyIntel.ts')

    print('\n' + '=' * 60)
    print('DONE! Generated 3 real data files.')
    print(f'  Signals:    {len(signals)} signals from {len(areas)} areas')
    print(f'  Off-Plan:   {len(offplan_projects)} projects from {len(developers)} developers')
    print(f'  Properties: {len(properties)} area-level investment profiles')


if __name__ == '__main__':
    main()
