#!/usr/bin/env python3
"""
Process DLD Building/Unit Registration data into TypeScript data files.
Source: dubailand.gov.ae Open Data → Building tab (3,197 unit registrations)

Outputs:
  - Per-project unit mix: bedroom breakdown, avg sizes, parking ratios
  - Per-area building stats: total registered units, type mix, offplan ratio
  - New development detail cards for the supply pipeline

Usage: cd pcis-p1-dashboard && python3 scripts/processBuildingData.py
"""

import csv
import json
import os
from collections import Counter, defaultdict

# DLD official name → PCIS marketing name mapping
DLD_TO_PCIS = {
    'Al Hebiah First': 'JUMEIRAH VILLAGE CIRCLE',
    'Al Hebiah Second': 'JUMEIRAH VILLAGE CIRCLE',
    'Al Hebiah Fourth': 'JUMEIRAH VILLAGE CIRCLE',
    'Al Hebiah Sixth': 'JUMEIRAH VILLAGE CIRCLE',
    'Al Hebiah Third': 'JUMEIRAH VILLAGE TRIANGLE',
    'Al Hebiah Fifth': 'Al Hebiah Fifth',
    'Marsa Dubai': 'DUBAI MARINA',
    'Al Thanyah First': 'JUMEIRAH LAKES TOWERS',
    'Al Barsha South Fourth': 'ARJAN',
    'Al Barsha South Fifth': 'ARJAN',
    'Al Yufrah 1': 'AL FURJAN',
    'Al Yufrah 2': 'AL FURJAN',
    'Wadi Al Safa 3': 'DUBAI LAND RESIDENCE COMPLEX',
    'Al Merkadh': 'DUBAI HILLS',
    'Al Goze Industrial First': 'MOTOR CITY',
    'Al Yelayiss 1': 'SILICON OASIS',
    'Al Yelayiss 2': 'SILICON OASIS',
    'Al Warsan First': 'INTERNATIONAL CITY PH 1',
    'Al Thanyah Third': 'BUSINESS PARK',
    'Al Thanyah Fifth': 'TECOM SITE A',
    'Saih Shuaib 1': 'DUBAI PRODUCTION CITY',
    'Saih Shuaib 2': 'DUBAI PRODUCTION CITY',
    'Wadi Al Safa 7': 'DUBAI SPORTS CITY',
    'Wadi Al Safa 6': 'MAJAN',
    'Saih Shuaib 3': 'DUBAI STUDIO CITY',
    'Jabal Ali Industrial Second': 'DUBAI SOUTH',
    'Al Barshaa South First': 'DUBAI SCIENCE PARK',
    'Al Jadaf': 'DUBAI CREEK HARBOUR',
    'Al Hudaiba': 'DUBAI MARITIME CITY',
    'Burj Khalifa': 'BURJ KHALIFA',
    'Business Bay': 'BUSINESS BAY',
    'Hadaeq Sheikh Mohammed Bin Rashid': 'Hadaeq Sheikh Mohammed Bin Rashid',
    'Dubai Investment Park First': 'Dubai Investment Park First',
    'Dubai Investment Park Second': 'Dubai Investment Park Second',
}

def resolve_area(dld_area):
    """Map DLD area name to PCIS marketing name, fallback to original."""
    return DLD_TO_PCIS.get(dld_area, dld_area)

def parse_rooms(rooms_str):
    """Parse '5 B/R' → 5, '' → 0"""
    if not rooms_str:
        return 0
    rooms_str = rooms_str.strip()
    if 'B/R' in rooms_str:
        try:
            return int(rooms_str.split()[0])
        except:
            return 0
    if 'Study' in rooms_str:
        try:
            return int(rooms_str.split()[0])
        except:
            return 0
    return 0

def safe_float(val, default=0):
    try:
        return float(val) if val else default
    except:
        return default

def safe_int(val, default=0):
    try:
        return int(val) if val else default
    except:
        return default

def main():
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'dld-buildings-2026.csv')

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Loaded {len(rows)} building/unit records")

    # =========================================================================
    # 1. Per-Project Unit Mix
    # =========================================================================
    project_stats = defaultdict(lambda: {
        'name': '',
        'area_dld': '',
        'area_pcis': '',
        'total_units': 0,
        'rooms': Counter(),
        'types': Counter(),
        'offplan': 0,
        'ready': 0,
        'freehold': 0,
        'total_bua': 0,
        'total_parking': 0,
        'creation_dates': [],
    })

    for r in rows:
        proj = r.get('PROJECT_EN', '').strip()
        if not proj:
            proj = 'Unregistered'
        area_dld = r.get('AREA_EN', '').strip()

        s = project_stats[proj]
        s['name'] = proj
        s['area_dld'] = area_dld
        s['area_pcis'] = resolve_area(area_dld)
        s['total_units'] += 1

        bedrooms = parse_rooms(r.get('ROOMS_EN', ''))
        s['rooms'][bedrooms] += 1
        s['types'][r.get('PROP_SUB_TYPE_EN', 'Unknown')] += 1

        if r.get('IS_OFFPLAN_EN') == 'Off-Plan':
            s['offplan'] += 1
        else:
            s['ready'] += 1

        if r.get('IS_FREE_HOLD_EN') == 'Free Hold':
            s['freehold'] += 1

        s['total_bua'] += safe_float(r.get('BUILT_UP_AREA'))
        s['total_parking'] += safe_int(r.get('CAR_PARKS'))

        cd = r.get('CREATION_DATE', '')
        if cd:
            s['creation_dates'].append(cd[:10])  # Date only

    # Build project details list (sorted by unit count)
    project_details = []
    for proj, s in sorted(project_stats.items(), key=lambda x: -x[1]['total_units']):
        if proj == 'Unregistered':
            continue
        avg_bua = s['total_bua'] / s['total_units'] if s['total_units'] > 0 else 0
        parking_ratio = s['total_parking'] / s['total_units'] if s['total_units'] > 0 else 0

        # Build room mix
        room_mix = {}
        for beds, count in sorted(s['rooms'].items()):
            label = f"{beds}BR" if beds > 0 else "Studio"
            room_mix[label] = count

        project_details.append({
            'name': s['name'],
            'areaDld': s['area_dld'],
            'areaPcis': s['area_pcis'],
            'totalUnits': s['total_units'],
            'roomMix': room_mix,
            'primaryType': s['types'].most_common(1)[0][0] if s['types'] else 'Unknown',
            'offplanUnits': s['offplan'],
            'readyUnits': s['ready'],
            'offplanPct': round(s['offplan'] / s['total_units'] * 100, 1) if s['total_units'] > 0 else 0,
            'freeholdPct': round(s['freehold'] / s['total_units'] * 100, 1) if s['total_units'] > 0 else 0,
            'avgBuiltUpArea': round(avg_bua, 1),
            'parkingRatio': round(parking_ratio, 2),
            'registrationDate': sorted(s['creation_dates'])[0] if s['creation_dates'] else '',
        })

    print(f"Processed {len(project_details)} projects with unit details")

    # =========================================================================
    # 2. Per-Area Building Stats (using PCIS names)
    # =========================================================================
    area_stats = defaultdict(lambda: {
        'totalRegistered': 0,
        'offplan': 0,
        'ready': 0,
        'rooms': Counter(),
        'types': Counter(),
        'total_bua': 0,
        'total_parking': 0,
        'projects': set(),
    })

    for r in rows:
        area_dld = r.get('AREA_EN', '').strip()
        area_pcis = resolve_area(area_dld)
        s = area_stats[area_pcis]
        s['totalRegistered'] += 1
        if r.get('IS_OFFPLAN_EN') == 'Off-Plan':
            s['offplan'] += 1
        else:
            s['ready'] += 1

        bedrooms = parse_rooms(r.get('ROOMS_EN', ''))
        s['rooms'][bedrooms] += 1
        s['types'][r.get('PROP_SUB_TYPE_EN', 'Unknown')] += 1
        s['total_bua'] += safe_float(r.get('BUILT_UP_AREA'))
        s['total_parking'] += safe_int(r.get('CAR_PARKS'))
        proj = r.get('PROJECT_EN', '').strip()
        if proj:
            s['projects'].add(proj)

    area_building_data = {}
    for area, s in sorted(area_stats.items(), key=lambda x: -x[1]['totalRegistered']):
        avg_bua = s['total_bua'] / s['totalRegistered'] if s['totalRegistered'] > 0 else 0
        room_mix = {}
        for beds, count in sorted(s['rooms'].items()):
            label = f"{beds}BR" if beds > 0 else "Studio"
            room_mix[label] = count

        area_building_data[area] = {
            'totalRegistered': s['totalRegistered'],
            'offplanUnits': s['offplan'],
            'readyUnits': s['ready'],
            'offplanPct': round(s['offplan'] / s['totalRegistered'] * 100, 1),
            'roomMix': room_mix,
            'primaryType': s['types'].most_common(1)[0][0] if s['types'] else 'Unknown',
            'avgBuiltUpArea': round(avg_bua, 1),
            'parkingRatio': round(s['total_parking'] / s['totalRegistered'], 2) if s['totalRegistered'] > 0 else 0,
            'projectCount': len(s['projects']),
            'projects': sorted(s['projects']),
        }

    print(f"Processed {len(area_building_data)} area building profiles")

    # =========================================================================
    # 3. Market-Wide Stats
    # =========================================================================
    total = len(rows)
    total_offplan = sum(1 for r in rows if r.get('IS_OFFPLAN_EN') == 'Off-Plan')
    total_ready = total - total_offplan

    market_stats = {
        'totalRegistrations': total,
        'offplanRegistrations': total_offplan,
        'readyRegistrations': total_ready,
        'offplanPct': round(total_offplan / total * 100, 1),
        'uniqueProjects': len(project_stats) - (1 if 'Unregistered' in project_stats else 0),
        'uniqueAreas': len(area_building_data),
        'avgBuiltUpArea': round(sum(safe_float(r.get('BUILT_UP_AREA')) for r in rows) / total, 1),
        'topRoomType': Counter(r.get('ROOMS_EN', '') for r in rows).most_common(1)[0][0],
        'dataDate': 'Q1 2026',
    }

    print(f"Market stats: {market_stats['totalRegistrations']} registrations, {market_stats['offplanPct']}% offplan")

    # =========================================================================
    # 4. Write TypeScript output
    # =========================================================================
    out_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'realBuildingData.ts')

    with open(out_path, 'w') as f:
        f.write('// Auto-generated from DLD Building/Unit Registration data (3,197 records, Q1 2026)\n')
        f.write('// Generated by scripts/processBuildingData.py\n')
        f.write('// DO NOT EDIT MANUALLY\n\n')

        # Types
        f.write('export interface ProjectUnitDetail {\n')
        f.write('  name: string;\n')
        f.write('  areaDld: string;\n')
        f.write('  areaPcis: string;\n')
        f.write('  totalUnits: number;\n')
        f.write('  roomMix: Record<string, number>;\n')
        f.write('  primaryType: string;\n')
        f.write('  offplanUnits: number;\n')
        f.write('  readyUnits: number;\n')
        f.write('  offplanPct: number;\n')
        f.write('  freeholdPct: number;\n')
        f.write('  avgBuiltUpArea: number;\n')
        f.write('  parkingRatio: number;\n')
        f.write('  registrationDate: string;\n')
        f.write('}\n\n')

        f.write('export interface AreaBuildingStats {\n')
        f.write('  totalRegistered: number;\n')
        f.write('  offplanUnits: number;\n')
        f.write('  readyUnits: number;\n')
        f.write('  offplanPct: number;\n')
        f.write('  roomMix: Record<string, number>;\n')
        f.write('  primaryType: string;\n')
        f.write('  avgBuiltUpArea: number;\n')
        f.write('  parkingRatio: number;\n')
        f.write('  projectCount: number;\n')
        f.write('  projects: string[];\n')
        f.write('}\n\n')

        f.write('export interface MarketBuildingStats {\n')
        f.write('  totalRegistrations: number;\n')
        f.write('  offplanRegistrations: number;\n')
        f.write('  readyRegistrations: number;\n')
        f.write('  offplanPct: number;\n')
        f.write('  uniqueProjects: number;\n')
        f.write('  uniqueAreas: number;\n')
        f.write('  avgBuiltUpArea: number;\n')
        f.write('  topRoomType: string;\n')
        f.write('  dataDate: string;\n')
        f.write('}\n\n')

        # Data
        f.write(f'export const REAL_PROJECT_UNITS: ProjectUnitDetail[] = {json.dumps(project_details, indent=2)};\n\n')
        f.write(f'export const REAL_AREA_BUILDINGS: Record<string, AreaBuildingStats> = {json.dumps(area_building_data, indent=2)};\n\n')
        f.write(f'export const REAL_MARKET_BUILDING_STATS: MarketBuildingStats = {json.dumps(market_stats, indent=2)};\n\n')

        # Helper functions
        f.write('// Helper functions\n')
        f.write('export function getProjectUnits(projectName: string): ProjectUnitDetail | undefined {\n')
        f.write('  return REAL_PROJECT_UNITS.find(p =>\n')
        f.write('    p.name.toLowerCase() === projectName.toLowerCase()\n')
        f.write('  );\n')
        f.write('}\n\n')
        f.write('export function getProjectsByArea(areaPcis: string): ProjectUnitDetail[] {\n')
        f.write('  return REAL_PROJECT_UNITS.filter(p =>\n')
        f.write('    p.areaPcis.toLowerCase() === areaPcis.toLowerCase()\n')
        f.write('  );\n')
        f.write('}\n\n')
        f.write('export function getAreaBuildingStats(areaPcis: string): AreaBuildingStats | undefined {\n')
        f.write('  return REAL_AREA_BUILDINGS[areaPcis];\n')
        f.write('}\n')

    file_size = os.path.getsize(out_path)
    print(f"\nWrote {out_path} ({file_size / 1024:.1f} KB)")
    print(f"  {len(project_details)} project unit details")
    print(f"  {len(area_building_data)} area building profiles")
    print("Done!")

if __name__ == '__main__':
    main()
