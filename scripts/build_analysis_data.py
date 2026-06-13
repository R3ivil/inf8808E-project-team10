#!/usr/bin/env python3
"""Regenerate chart-ready CSV summaries from the Stack Overflow 2025 subset.

Default input is the project-level subset kept outside this Vite repo:
../data/results.csv.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path

csv.field_size_limit(sys.maxsize)


MISSING = {"", "NA", "N/A", "None", "Prefer not to say"}

ADOPTION = {
    "Yes, I use AI tools daily": "Daily users",
    "Yes, I use AI tools weekly": "Weekly users",
    "Yes, I use AI tools monthly or infrequently": "Occasional users",
    "No, but I plan to soon": "Planned users",
    "No, and I don't plan to": "Non-users",
}

ADOPTION_ORDER = ["Daily users", "Weekly users", "Occasional users", "Planned users", "Non-users"]

AISELECT_COLUMNS = [
    "group",
    "n_group",
    "n_AISelect",
    "missing_AISelect",
    "Daily%",
    "Weekly%",
    "Monthly%",
    "Planned%",
    "NonUser%",
    "AnyUser%",
]

METRIC_COLUMNS = [
    "n_group",
    "n_AISelect",
    "missing_AISelect",
    "AnyUser%",
    "Frequent%",
    "n_Trust",
    "missing_Trust",
    "Trust%",
    "n_Complex",
    "missing_Complex",
    "ComplexConf%",
    "n_Sent",
    "missing_Sent",
    "Favorable%",
    "n_Threat",
    "missing_Threat",
    "Threat%",
    "n_Agent",
    "missing_Agent",
    "AgentUser%",
    "AdoptTrustGap",
    "AdoptComplexGap",
]

FRUSTRATION_ITEMS = [
    "AI solutions that are almost right, but not quite",
    "Debugging AI-generated code is more time-consuming",
    "I don’t use AI tools regularly",
    "I haven’t encountered any problems",
    "It’s hard to understand how or why the code works",
    "I’ve become less confident in my own problem-solving",
    "Other (write in):",
]

AIHUMAN_ITEMS = [
    "When I don’t trust AI’s answers",
    "When I have ethical or security concerns about code",
    "When I want to fully understand something",
    "When I want to learn best practices",
    "When I’m stuck and can’t explain the problem",
    "When I need help fixing complex or unfamiliar code",
    "When I want to compare different solutions",
    "When I need quick help troubleshooting",
    "I don’t think I’ll need help from people anymore",
]

TRUST_ORDER = [
    "Highly distrust",
    "Somewhat distrust",
    "Neither trust nor distrust",
    "Somewhat trust",
    "Highly trust",
]

COMPLEX_ORDER = [
    "Bad at handling complex tasks",
    "Good, but not great at handling complex tasks",
    "I don't use AI tools for complex tasks / I don't know",
    "Neither good or bad at handling complex tasks",
    "Very poor at handling complex tasks",
    "Very well at handling complex tasks",
]

AGE_ORDER = [
    "18-24 years old",
    "25-34 years old",
    "35-44 years old",
    "45-54 years old",
    "55-64 years old",
    "65 years or older",
]

YEARS_ORDER = ["0-3 years", "4-8 years", "9-15 years", "16+ years"]
REMOTE_ORDER = ["Hybrid, remote-leaning", "In-person", "Hybrid, office-leaning", "Remote"]
ORGSIZE_ORDER = [
    "Just me - I am a freelancer, sole proprietor, etc.",
    "Less than 20 employees",
    "20 to 99 employees",
    "100 to 499 employees",
    "500 to 999 employees",
    "1,000 to 4,999 employees",
    "5,000 to 9,999 employees",
    "10,000 or more employees",
]


def clean(value: str | None) -> str:
    return "" if value is None else value.strip()


def valid(value: str | None) -> bool:
    return clean(value) not in MISSING


def pct(numerator: int | float, denominator: int | float) -> str:
    if not denominator:
        return "0.0"
    return f"{100 * numerator / denominator:.1f}"


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as target:
        writer = csv.DictWriter(target, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def role_bucket(value: str) -> str:
    if value.startswith("Developer, "):
        return value.replace("Developer, ", "Dev: ", 1)
    aliases = {
        "Engineering manager": "Manager",
        "Project manager": "Manager",
        "Senior executive (C-suite, VP, etc.)": "Senior executive",
        "Architect, software or solutions": "Architect",
        "DevOps engineer or professional": "DevOps engineer",
        "Cloud infrastructure engineer": "Cloud infra engineer",
        "Data or business analyst": "Data/Business analyst",
        "System administrator": "Sysadmin",
        "Cybersecurity or InfoSec professional": "Security",
        "Founder, technology or otherwise": "Founder",
    }
    if value.startswith("Other"):
        return "Other"
    return aliases.get(value, value)


def years_bin(value: str) -> str:
    if not valid(value):
        return ""
    if value == "Less than 1 year":
        years = 0.5
    elif value == "More than 50 years":
        years = 51.0
    else:
        try:
            years = float(value)
        except ValueError:
            return ""
    if years <= 3:
        return "0-3 years"
    if years <= 8:
        return "4-8 years"
    if years <= 15:
        return "9-15 years"
    return "16+ years"


def remote_bucket(value: str) -> str:
    if value == "Remote":
        return "Remote"
    if value == "In-person":
        return "In-person"
    if "leans heavy to flexibility" in value:
        return "Hybrid, remote-leaning"
    if "leans heavy to in-person" in value:
        return "Hybrid, office-leaning"
    return ""


def orgsize_bucket(value: str) -> str:
    if "don" in value.lower() and "know" in value.lower():
        return ""
    return value


def adoption_group(row: dict[str, str]) -> str:
    return ADOPTION.get(clean(row.get("AISelect")), "")


def is_ai_user(row: dict[str, str]) -> bool:
    return adoption_group(row) in {"Daily users", "Weekly users", "Occasional users"}


def is_frequent_user(row: dict[str, str]) -> bool:
    return adoption_group(row) in {"Daily users", "Weekly users"}


def is_trust_high(row: dict[str, str]) -> bool:
    return clean(row.get("AIAcc")) in {"Highly trust", "Somewhat trust"}


def is_complex_confident(row: dict[str, str]) -> bool:
    return clean(row.get("AIComplex")) in {
        "Very well at handling complex tasks",
        "Good, but not great at handling complex tasks",
    }


def is_favorable(row: dict[str, str]) -> bool:
    return clean(row.get("AISent")) in {"Very favorable", "Favorable"}


def is_agent_user(row: dict[str, str]) -> bool:
    return clean(row.get("AIAgents")) in {
        "Yes, I use AI agents at work daily",
        "Yes, I use AI agents at work weekly",
        "Yes, I use AI agents at work monthly or infrequently",
    }


def group_rows(rows: list[dict[str, str]], key_func) -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        key = key_func(row)
        if key:
            grouped[key].append(row)
    return grouped


def metric_summary(group: str, rows: list[dict[str, str]]) -> dict[str, object]:
    n_group = len(rows)
    n_ai = sum(valid(row.get("AISelect")) for row in rows)
    n_trust = sum(valid(row.get("AIAcc")) for row in rows)
    n_complex = sum(valid(row.get("AIComplex")) for row in rows)
    n_sent = sum(valid(row.get("AISent")) for row in rows)
    n_threat = sum(valid(row.get("AIThreat")) for row in rows)
    n_agent = sum(valid(row.get("AIAgents")) for row in rows)

    any_user = pct(sum(is_ai_user(row) for row in rows), n_ai)
    trust = pct(sum(is_trust_high(row) for row in rows), n_trust)
    complex_conf = pct(sum(is_complex_confident(row) for row in rows), n_complex)

    return {
        "group": group,
        "n_group": n_group,
        "n_AISelect": n_ai,
        "missing_AISelect": n_group - n_ai,
        "AnyUser%": any_user,
        "Frequent%": pct(sum(is_frequent_user(row) for row in rows), n_ai),
        "n_Trust": n_trust,
        "missing_Trust": n_group - n_trust,
        "Trust%": trust,
        "n_Complex": n_complex,
        "missing_Complex": n_group - n_complex,
        "ComplexConf%": complex_conf,
        "n_Sent": n_sent,
        "missing_Sent": n_group - n_sent,
        "Favorable%": pct(sum(is_favorable(row) for row in rows), n_sent),
        "n_Threat": n_threat,
        "missing_Threat": n_group - n_threat,
        "Threat%": pct(sum(clean(row.get("AIThreat")) == "Yes" for row in rows), n_threat),
        "n_Agent": n_agent,
        "missing_Agent": n_group - n_agent,
        "AgentUser%": pct(sum(is_agent_user(row) for row in rows), n_agent),
        "AdoptTrustGap": f"{float(any_user) - float(trust):.1f}",
        "AdoptComplexGap": f"{float(any_user) - float(complex_conf):.1f}",
    }


def adoption_summary(group: str, rows: list[dict[str, str]]) -> dict[str, object]:
    n_group = len(rows)
    n_ai = sum(valid(row.get("AISelect")) for row in rows)
    counts = Counter(adoption_group(row) for row in rows if adoption_group(row))
    return {
        "group": group,
        "n_group": n_group,
        "n_AISelect": n_ai,
        "missing_AISelect": n_group - n_ai,
        "Daily%": pct(counts["Daily users"], n_ai),
        "Weekly%": pct(counts["Weekly users"], n_ai),
        "Monthly%": pct(counts["Occasional users"], n_ai),
        "Planned%": pct(counts["Planned users"], n_ai),
        "NonUser%": pct(counts["Non-users"], n_ai),
        "AnyUser%": pct(counts["Daily users"] + counts["Weekly users"] + counts["Occasional users"], n_ai),
    }


def agent_summary(group: str, rows: list[dict[str, str]]) -> dict[str, object]:
    n_group = len(rows)
    n_agent = sum(valid(row.get("AIAgents")) for row in rows)
    n_change = sum(valid(row.get("AIAgentChange")) for row in rows)
    return {
        "group": group,
        "n_group": n_group,
        "n_agent": n_agent,
        "missing_Agent": n_group - n_agent,
        "AgentUser%": pct(sum(is_agent_user(row) for row in rows), n_agent),
        "AgentDaily%": pct(sum(clean(row.get("AIAgents")) == "Yes, I use AI agents at work daily" for row in rows), n_agent),
        "CopilotOnly%": pct(sum(clean(row.get("AIAgents")) == "No, I use AI exclusively in copilot/autocomplete mode" for row in rows), n_agent),
        "AgentPlanned%": pct(sum(clean(row.get("AIAgents")) == "No, but I plan to" for row in rows), n_agent),
        "AgentNo%": pct(sum(clean(row.get("AIAgents")) == "No, and I don't plan to" for row in rows), n_agent),
        "n_change": n_change,
        "missing_Change": n_group - n_change,
        "GreatChange%": pct(sum(clean(row.get("AIAgentChange")) == "Yes, to a great extent" for row in rows), n_change),
    }


def split_multi(value: str) -> list[str]:
    if not valid(value):
        return []
    return [part.strip() for part in value.split(";") if part.strip()]


def multi_select_summary(
    group: str,
    rows: list[dict[str, str]],
    source_col: str,
    missing_col: str,
    items: list[str],
) -> dict[str, object]:
    n_group = len(rows)
    responders = [row for row in rows if valid(row.get(source_col))]
    n_resp = len(responders)
    counts = Counter(item for row in responders for item in split_multi(clean(row.get(source_col))))
    out: dict[str, object] = {
        "group": group,
        "n_group": n_group,
        "n_resp": n_resp,
        missing_col: n_group - n_resp,
    }
    for item in items:
        out[item] = pct(counts[item], n_resp)
    return out


def frustration_summary(group: str, rows: list[dict[str, str]]) -> dict[str, object]:
    responders = [row for row in rows if valid(row.get("AIFrustration"))]
    n_resp = len(responders)
    counts = Counter(item for row in responders for item in split_multi(clean(row.get("AIFrustration"))))
    out: dict[str, object] = {"group": group, "n_resp": n_resp}
    for item in FRUSTRATION_ITEMS:
        out[item] = pct(counts[item], n_resp)
    return out


def ordered_or_sorted(rows: list[dict[str, object]], order: list[str] | None = None, by: str = "AnyUser%") -> list[dict[str, object]]:
    if order:
        positions = {value: index for index, value in enumerate(order)}
        return sorted(rows, key=lambda row: positions.get(str(row["group"]), len(positions)))
    return sorted(rows, key=lambda row: float(row[by]), reverse=True)


def build(input_path: Path, output_dir: Path) -> None:
    rows = read_rows(input_path)

    role_groups = group_rows(rows, lambda row: role_bucket(clean(row.get("DevType"))) if valid(row.get("DevType")) else "")
    industry_groups = group_rows(rows, lambda row: clean(row.get("Industry")) if valid(row.get("Industry")) else "")
    age_groups = group_rows(rows, lambda row: clean(row.get("Age")) if valid(row.get("Age")) else "")
    years_groups = group_rows(rows, lambda row: years_bin(clean(row.get("YearsCode"))))
    remote_groups = group_rows(rows, lambda row: remote_bucket(clean(row.get("RemoteWork"))) if valid(row.get("RemoteWork")) else "")
    orgsize_groups = group_rows(rows, lambda row: orgsize_bucket(clean(row.get("OrgSize"))) if valid(row.get("OrgSize")) else "")
    icorpm_groups = group_rows(rows, lambda row: clean(row.get("ICorPM")) if valid(row.get("ICorPM")) else "")
    adoption_groups = group_rows(rows, adoption_group)
    trust_groups = group_rows(rows, lambda row: clean(row.get("AIAcc")) if valid(row.get("AIAcc")) else "")
    complex_groups = group_rows(rows, lambda row: clean(row.get("AIComplex")) if valid(row.get("AIComplex")) else "")

    role_metrics = [metric_summary(group, group_rows_) for group, group_rows_ in role_groups.items()]
    role_metrics = [row for row in role_metrics if row["n_AISelect"] >= 150]
    role_metrics = ordered_or_sorted(role_metrics)
    for row in role_metrics:
        row["Role"] = row["group"]
    write_csv(output_dir / "role_metrics.csv", role_metrics, ["Role", "group", *METRIC_COLUMNS])

    industry_metrics = [metric_summary(group, group_rows_) for group, group_rows_ in industry_groups.items()]
    industry_metrics = [row for row in industry_metrics if row["n_AISelect"] >= 150]
    industry_metrics = ordered_or_sorted(industry_metrics)
    for row in industry_metrics:
        row["Industry"] = row["group"]
    write_csv(output_dir / "industry_metrics.csv", industry_metrics, ["Industry", "group", *METRIC_COLUMNS])

    adoption_jobs = [
        ("role_adoption_composition.csv", role_groups, None),
        ("industry_cohort_stats.csv", industry_groups, None),
        ("age_cohort_stats.csv", age_groups, AGE_ORDER),
        ("yearscode_cohort_stats.csv", years_groups, YEARS_ORDER),
        ("remotework_cohort_stats.csv", remote_groups, REMOTE_ORDER),
        ("orgsize_cohort_stats.csv", orgsize_groups, ORGSIZE_ORDER),
        ("icorpm_adoption_composition.csv", icorpm_groups, None),
    ]
    for filename, groups, order in adoption_jobs:
        summaries = [adoption_summary(group, group_rows_) for group, group_rows_ in groups.items()]
        summaries = [row for row in summaries if row["n_AISelect"] >= 150]
        write_csv(output_dir / filename, ordered_or_sorted(summaries, order), AISELECT_COLUMNS)

    agent_columns = [
        "group",
        "n_group",
        "n_agent",
        "missing_Agent",
        "AgentUser%",
        "AgentDaily%",
        "CopilotOnly%",
        "AgentPlanned%",
        "AgentNo%",
        "n_change",
        "missing_Change",
        "GreatChange%",
    ]
    for filename, groups in [
        ("agent_readiness_by_role.csv", role_groups),
        ("agent_readiness_by_industry.csv", industry_groups),
    ]:
        summaries = [agent_summary(group, group_rows_) for group, group_rows_ in groups.items()]
        summaries = [row for row in summaries if row["n_agent"] >= 150]
        write_csv(output_dir / filename, ordered_or_sorted(summaries, by="AgentUser%"), agent_columns)

    frustrations = [frustration_summary(group, group_rows_) for group, group_rows_ in adoption_groups.items()]
    write_csv(
        output_dir / "frustrations_by_adoption.csv",
        ordered_or_sorted(frustrations, ADOPTION_ORDER),
        ["group", "n_resp", *FRUSTRATION_ITEMS],
    )

    human_jobs = [
        ("aihuman_by_trust.csv", trust_groups, TRUST_ORDER),
        ("aihuman_by_complex.csv", complex_groups, COMPLEX_ORDER),
        ("aihuman_by_adoption.csv", adoption_groups, ADOPTION_ORDER),
    ]
    human_columns = ["group", "n_group", "n_resp", "missing_AIHuman", *AIHUMAN_ITEMS]
    for filename, groups, order in human_jobs:
        summaries = [
            multi_select_summary(group, group_rows_, "AIHuman", "missing_AIHuman", AIHUMAN_ITEMS)
            for group, group_rows_ in groups.items()
        ]
        summaries = [row for row in summaries if row["n_resp"] >= 150]
        write_csv(output_dir / filename, ordered_or_sorted(summaries, order), human_columns)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("../data/results.csv.csv"),
        help="Path to the one-row-per-respondent project subset CSV.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("public/data/analysis"),
        help="Directory for regenerated chart-ready CSVs.",
    )
    args = parser.parse_args()
    build(args.input, args.out)
    print(f"Wrote analysis CSVs to {args.out}")


if __name__ == "__main__":
    main()
