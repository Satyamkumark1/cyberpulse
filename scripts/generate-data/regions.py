"""Seven metro clusters (FR-01.4), each with a small set of hotspot zones.

Zone weights are the source of two of the eight planted patterns: withdrawal
density and historical hotspot behaviour (FR-01.5). A zone's weight is its
share of that region's withdrawals — heavily skewed (90/5/3/2, one dominant
zone per region) so the pattern is not just statistically detectable but
concentrated enough for FEAT-07's ranking gates (top-3 >= 0.72) to be
achievable at all: the milder 45/25/18/12 split this shipped with originally
gave a *theoretical* top-3 ceiling of about 0.30 no matter how good the
model was — see project-management/decision-log.md.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Zone:
    name: str
    lat: float
    lon: float
    weight: float  # share of the region's withdrawals/ATMs placed here


@dataclass(frozen=True)
class Region:
    name: str
    city: str
    district: str
    state: str
    lat: float
    lon: float
    zones: tuple[Zone, ...]


# Centre coordinates are real, publicly known city coordinates — reference
# geography for a synthetic generator, not a claim about any real event.
REGIONS: tuple[Region, ...] = (
    Region(
        "Delhi/NCR", "Delhi", "New Delhi", "Delhi", 28.6139, 77.2090,
        (
            Zone("Connaught Place", 28.6315, 77.2167, 0.9),
            Zone("Karol Bagh", 28.6519, 77.1909, 0.05),
            Zone("Nehru Place", 28.5495, 77.2500, 0.03),
            Zone("Dwarka", 28.5921, 77.0460, 0.02),
        ),
    ),
    Region(
        "Mumbai", "Mumbai", "Mumbai Suburban", "Maharashtra", 19.0760, 72.8777,
        (
            Zone("Andheri", 19.1197, 72.8468, 0.9),
            Zone("Dadar", 19.0176, 72.8434, 0.05),
            Zone("Borivali", 19.2307, 72.8567, 0.03),
            Zone("Chembur", 19.0522, 72.9005, 0.02),
        ),
    ),
    Region(
        "Hyderabad", "Hyderabad", "Hyderabad", "Telangana", 17.3850, 78.4867,
        (
            Zone("Hitech City", 17.4435, 78.3772, 0.9),
            Zone("Secunderabad", 17.4399, 78.4983, 0.05),
            Zone("Dilsukhnagar", 17.3687, 78.5247, 0.03),
            Zone("Kukatpally", 17.4849, 78.4138, 0.02),
        ),
    ),
    Region(
        "Bengaluru", "Bengaluru", "Bengaluru Urban", "Karnataka", 12.9716, 77.5946,
        (
            Zone("Koramangala", 12.9352, 77.6245, 0.9),
            Zone("Whitefield", 12.9698, 77.7500, 0.05),
            Zone("Indiranagar", 12.9719, 77.6412, 0.03),
            Zone("Yeshwanthpur", 13.0284, 77.5540, 0.02),
        ),
    ),
    Region(
        "Chennai", "Chennai", "Chennai", "Tamil Nadu", 13.0827, 80.2707,
        (
            Zone("T Nagar", 13.0418, 80.2341, 0.9),
            Zone("Anna Nagar", 13.0850, 80.2101, 0.05),
            Zone("Velachery", 12.9791, 80.2183, 0.03),
            Zone("Tambaram", 12.9249, 80.1000, 0.02),
        ),
    ),
    Region(
        "Ahmedabad", "Ahmedabad", "Ahmedabad", "Gujarat", 23.0225, 72.5714,
        (
            Zone("Navrangpura", 23.0367, 72.5601, 0.9),
            Zone("Maninagar", 22.9970, 72.6027, 0.05),
            Zone("Bopal", 23.0324, 72.4693, 0.03),
            Zone("Vastrapur", 23.0368, 72.5288, 0.02),
        ),
    ),
    Region(
        "Lucknow", "Lucknow", "Lucknow", "Uttar Pradesh", 26.8467, 80.9462,
        (
            Zone("Hazratganj", 26.8500, 80.9463, 0.9),
            Zone("Gomti Nagar", 26.8467, 81.0140, 0.05),
            Zone("Aliganj", 26.8892, 80.9309, 0.03),
            Zone("Indira Nagar", 26.8782, 80.9724, 0.02),
        ),
    ),
)
