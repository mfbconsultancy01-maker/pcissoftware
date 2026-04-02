#!/usr/bin/env python3
"""
Process DLD Projects CSV (153 active/pending projects) into PCIS supply pipeline data.
Generates:
- Per-area supply pipeline (projects, units, completion dates)
- Developer profiles (portfolio, active projects)
- Market-wide supply statistics
"""

import csv
import json
import statistics
from collections import defaultdict, Counter
from datetime import datetime

CSV_PATH = 'public/data/dld-projects-2026.csv'
OUTPUT_PATH = 'src/lib/realProjectData.ts'

def slugify(name):
    return name.lower().replace(' ', '-').replace("'", '').replace('/', '-')

def parse_date(d):
    if not d:
        return None
    try:
        return datetime.strptime(d[:10], '%Y-%m-%d')
    except:
        return None

def format_date(d):
    if not d:
        return ''
    return d.strftime('%Y-%m-%d')

def main():
    print("Loading DLD Projects CSV...")
    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    print(f"Loaded {len(rows)} project records")

    # ===== 1. PER-AREA SUPPLY PIPELINE =====
    area_projects = defaultdict(list)

    for r in rows:
        area = (r.get('AREA_EN') or '').strip()
        if not area:
            continue

        units = int(r.get('CNT_UNIT', '0') or 0)
        villas = int(r.get('CNT_VILLA', '0') or 0)
        total_units = units + villas

        start_date = parse_date(r.get('START_DATE', ''))
        end_date = parse_date(r.get('END_DATE', ''))
        completion_date = parse_date(r.get('COMPLETION_DATE', ''))

        pct_complete = 0
        try:
            pct_complete = float(r.get('PERCENT_COMPLETED', '0') or 0)
        except:
            pass

        project_value = 0
        try:
            project_value = float(r.get('PROJECT_VALUE', '0') or 0)
        except:
            pass

        project = {
            'name': (r.get('PROJECT_EN') or '').strip(),
            'developer': (r.get('DEVELOPER_EN') or '').strip(),
            'totalUnits': total_units,
            'unitCount': units,
            'villaCount': villas,
            'status': (r.get('PROJECT_STATUS') or '').strip(),
            'percentComplete': round(pct_complete, 1),
            'projectValue': project_value,
            'startDate': format_date(start_date),
            'endDate': format_date(end_date),
            'completionDate': format_date(completion_date),
            'masterProject': (r.get('MASTER_PROJECT_EN') or '').strip(),
        }
        area_projects[area].append(project)

    # Build area supply summaries
    area_supply = []
    for area_name, projects in sorted(area_projects.items(), key=lambda x: sum(p['totalUnits'] for p in x[1]), reverse=True):
        total_units = sum(p['totalUnits'] for p in projects)
        total_value = sum(p['projectValue'] for p in projects)
        developers = list(set(p['developer'] for p in projects if p['developer']))
        avg_completion = statistics.mean([p['percentComplete'] for p in projects]) if projects else 0

        area_supply.append({
            'areaName': area_name,
            'areaId': slugify(area_name),
            'projectCount': len(projects),
            'totalUnits': total_units,
            'totalProjectValue': total_value,
            'avgPercentComplete': round(avg_completion, 1),
            'developers': developers[:10],
            'projects': sorted(projects, key=lambda p: p['totalUnits'], reverse=True),
        })

    print(f"Generated supply pipeline for {len(area_supply)} areas")

    # ===== 2. DEVELOPER PROFILES =====
    dev_projects = defaultdict(list)
    for r in rows:
        dev = (r.get('DEVELOPER_EN') or '').strip()
        if not dev:
            continue
        units = int(r.get('CNT_UNIT', '0') or 0) + int(r.get('CNT_VILLA', '0') or 0)
        val = float(r.get('PROJECT_VALUE', '0') or 0)
        dev_projects[dev].append({
            'name': (r.get('PROJECT_EN') or '').strip(),
            'area': (r.get('AREA_EN') or '').strip(),
            'units': units,
            'value': val,
            'status': (r.get('PROJECT_STATUS') or '').strip(),
            'percentComplete': float(r.get('PERCENT_COMPLETED', '0') or 0),
        })

    developer_profiles = []
    for dev_name, projects in sorted(dev_projects.items(), key=lambda x: sum(p['units'] for p in x[1]), reverse=True):
        total_units = sum(p['units'] for p in projects)
        total_value = sum(p['value'] for p in projects)
        areas = list(set(p['area'] for p in projects if p['area']))

        developer_profiles.append({
            'name': dev_name,
            'projectCount': len(projects),
            'totalUnits': total_units,
            'totalValue': total_value,
            'areas': areas,
            'projects': projects,
        })

    print(f"Generated profiles for {len(developer_profiles)} developers")

    # ===== 3. MARKET-WIDE STATS =====
    total_active = sum(1 for r in rows if r.get('PROJECT_STATUS') == 'ACTIVE')
    total_pending = sum(1 for r in rows if r.get('PROJECT_STATUS') == 'PENDING')
    total_units_all = sum(int(r.get('CNT_UNIT', '0') or 0) + int(r.get('CNT_VILLA', '0') or 0) for r in rows)
    total_value_all = sum(float(r.get('PROJECT_VALUE', '0') or 0) for r in rows)

    market_stats = {
        'totalProjects': len(rows),
        'activeProjects': total_active,
        'pendingProjects': total_pending,
        'totalUnits': total_units_all,
        'totalProjectValue': total_value_all,
        'uniqueDevelopers': len(dev_projects),
        'uniqueAreas': len(area_projects),
    }

    print(f"Market stats: {total_active} active, {total_pending} pending, {total_units_all} units, AED {total_value_all/1e9:.1f}B value")

    # ===== 4. GENERATE TYPESCRIPT OUTPUT =====
    print(f"\nWriting TypeScript to {OUTPUT_PATH}...")

    with open(OUTPUT_PATH, 'w') as f:
        f.write('// Auto-generated from DLD Projects data (153 projects, Q1 2026)\n')
        f.write('// Generated by scripts/processProjectData.py\n')
        f.write('// DO NOT EDIT MANUALLY\n\n')

        f.write(f'export const REAL_AREA_SUPPLY: AreaSupply[] = {json.dumps(area_supply, indent=2)};\n\n')
        f.write(f'export const REAL_DEVELOPER_PROFILES: DeveloperProfile[] = {json.dumps(developer_profiles, indent=2)};\n\n')
        f.write(f'export const REAL_MARKET_SUPPLY_STATS: MarketSupplyStats = {json.dumps(market_stats, indent=2)};\n\n')

        f.write("""
export interface SupplyProject {
  name: string;
  developer: string;
  totalUnits: number;
  unitCount: number;
  villaCount: number;
  status: string;
  percentComplete: number;
  projectValue: number;
  startDate: string;
  endDate: string;
  completionDate: string;
  masterProject: string;
}

export interface AreaSupply {
  areaName: string;
  areaId: string;
  projectCount: number;
  totalUnits: number;
  totalProjectValue: number;
  avgPercentComplete: number;
  developers: string[];
  projects: SupplyProject[];
}

export interface DeveloperProfile {
  name: string;
  projectCount: number;
  totalUnits: number;
  totalValue: number;
  areas: string[];
  projects: { name: string; area: string; units: number; value: number; status: string; percentComplete: number }[];
}

export interface MarketSupplyStats {
  totalProjects: number;
  activeProjects: number;
  pendingProjects: number;
  totalUnits: number;
  totalProjectValue: number;
  uniqueDevelopers: number;
  uniqueAreas: number;
}

// Helper functions
export function getSupplyByArea(areaName: string): AreaSupply | undefined {
  return REAL_AREA_SUPPLY.find(s =>
    s.areaName.toLowerCase() === areaName.toLowerCase() ||
    s.areaId === areaName.toLowerCase().replace(/ /g, '-')
  );
}

export function getDeveloperProfile(name: string): DeveloperProfile | undefined {
  return REAL_DEVELOPER_PROFILES.find(d => d.name.toLowerCase().includes(name.toLowerCase()));
}

export function getTopDevelopersByUnits(limit: number = 10): DeveloperProfile[] {
  return REAL_DEVELOPER_PROFILES.slice(0, limit);
}
""")

    import os
    size = os.path.getsize(OUTPUT_PATH)
    print(f"\nOutput: {OUTPUT_PATH} ({size / 1024:.0f} KB)")
    print(f"  - {len(area_supply)} area supply pipelines")
    print(f"  - {len(developer_profiles)} developer profiles")
    print("\nDone!")

if __name__ == '__main__':
    main()
