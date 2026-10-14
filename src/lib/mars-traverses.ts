// Simplified surface tracks for the global map (not full sol-by-sol GPS).
// Vertices are ordered landing → later positions. For live Curiosity /
// Perseverance detail, the site card links to NASA MMGIS.
// Coordinates: planetocentric lat, east lon.

export type TraversePath = {
  siteId: string;
  /** Rough total length for the caption */
  label: string;
  color: string;
  points: [number, number][];
};

export const MARS_TRAVERSES: TraversePath[] = [
  {
    siteId: "curiosity",
    label: "Curiosity traverse (simplified)",
    color: "#3ecf8e",
    points: [
      [-4.5895, 137.4417], // Bradbury Landing
      [-4.62, 137.40],
      [-4.70, 137.38],
      [-4.75, 137.35],
      [-4.78, 137.32], // toward Mount Sharp foothills
      [-4.82, 137.30],
      [-4.88, 137.28],
      [-4.95, 137.26],
      [-5.00, 137.25],
    ],
  },
  {
    siteId: "perseverance",
    label: "Perseverance traverse (simplified)",
    color: "#6eb6ff",
    points: [
      [18.4447, 77.4508], // Octavia E. Butler Landing
      [18.43, 77.43],
      [18.42, 77.40],
      [18.41, 77.38],
      [18.40, 77.36], // toward delta
      [18.39, 77.34],
      [18.38, 77.32],
      [18.37, 77.30],
    ],
  },
  {
    siteId: "opportunity",
    label: "Opportunity traverse (simplified)",
    color: "#9eb0c8",
    points: [
      [-1.9462, 354.4734],
      [-1.95, 354.50],
      [-2.05, 354.60],
      [-2.15, 354.80],
      [-2.20, 355.00],
      [-2.10, 355.20],
      [-2.05, 355.40],
    ],
  },
  {
    siteId: "spirit",
    label: "Spirit traverse (simplified)",
    color: "#9eb0c8",
    points: [
      [-14.5719, 175.4785],
      [-14.58, 175.50],
      [-14.60, 175.52],
      [-14.62, 175.55],
      [-14.65, 175.58],
      [-14.68, 175.60],
    ],
  },
  {
    siteId: "zhurong",
    label: "Zhurong traverse (simplified)",
    color: "#c9a227",
    points: [
      [25.10, 109.91],
      [25.08, 109.92],
      [25.06, 109.93],
      [25.05, 109.94],
    ],
  },
];
