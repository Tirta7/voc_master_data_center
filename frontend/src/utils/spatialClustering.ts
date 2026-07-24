interface Point {
    id: number;
    type: 'CAFE' | 'BILLIARD';
    x: number;
    y: number;
}

interface Cluster {
    centroid: { x: number; y: number };
    points: Point[];
}

/**
 * Calculates Euclidean distance between two points
 */
const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

/**
 * Perform K-Means clustering on the tables based on their physical (x,y) coordinates.
 * This ensures tables that are grouped together are physically close.
 */
export const performKMeansClustering = (tables: Point[], k: number, maxIterations: number = 50): Point[][] => {
    if (k <= 0) return [];
    if (tables.length === 0) return Array.from({ length: k }, () => []);
    if (k >= tables.length) {
        // If there are more or equal waiters than tables, just give one table per waiter and empty for the rest
        const result: Point[][] = Array.from({ length: k }, () => []);
        tables.forEach((t, i) => result[i].push(t));
        return result;
    }

    // 1. Initialize K centroids randomly from the existing points (Forgy method)
    // To ensure reproducible and well-distributed initial centroids, we can pick the first, then pick the furthest from the first, etc. (K-Means++)
    let centroids: { x: number; y: number }[] = [];
    centroids.push({ x: tables[0].x, y: tables[0].y });
    
    for (let i = 1; i < k; i++) {
        let maxDist = -1;
        let bestPoint = tables[0];
        
        for (const point of tables) {
            // Find distance from this point to the CLOSEST existing centroid
            let minDistToCentroid = Infinity;
            for (const c of centroids) {
                const dist = getDistance(point, c);
                if (dist < minDistToCentroid) minDistToCentroid = dist;
            }
            
            // Choose the point that is furthest away from all existing centroids
            if (minDistToCentroid > maxDist) {
                maxDist = minDistToCentroid;
                bestPoint = point;
            }
        }
        centroids.push({ x: bestPoint.x, y: bestPoint.y });
    }

    let clusters: Cluster[] = centroids.map(c => ({ centroid: c, points: [] }));
    let hasChanged = true;
    let iteration = 0;

    // 2. Loop until convergence or max iterations
    while (hasChanged && iteration < maxIterations) {
        hasChanged = false;
        
        // Clear previous points
        clusters.forEach(c => c.points = []);

        // Assignment step: assign each table to the nearest centroid
        for (const table of tables) {
            let nearestIdx = 0;
            let minDist = Infinity;
            
            for (let i = 0; i < clusters.length; i++) {
                const dist = getDistance(table, clusters[i].centroid);
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }
            
            clusters[nearestIdx].points.push(table);
        }

        // Update step: recalculate centroids
        for (const cluster of clusters) {
            if (cluster.points.length === 0) continue;
            
            const sumX = cluster.points.reduce((sum, p) => sum + p.x, 0);
            const sumY = cluster.points.reduce((sum, p) => sum + p.y, 0);
            const newCentroid = {
                x: sumX / cluster.points.length,
                y: sumY / cluster.points.length
            };

            // Check if centroid moved significantly
            if (Math.abs(cluster.centroid.x - newCentroid.x) > 0.1 || Math.abs(cluster.centroid.y - newCentroid.y) > 0.1) {
                hasChanged = true;
                cluster.centroid = newCentroid;
            }
        }
        
        iteration++;
    }

    return clusters.map(c => c.points);
};

/**
 * Rotates the assignment arrays.
 * If waiters = [A, B, C] and assignments = [Zone1, Zone2, Zone3]
 * Rotating by 1 means assignments become [Zone3, Zone1, Zone2]
 */
export const rotateAssignments = <T>(assignments: T[][], steps: number = 1): T[][] => {
    if (assignments.length <= 1) return assignments;
    const len = assignments.length;
    const actualSteps = ((steps % len) + len) % len; // Ensure positive rotation
    
    const rotated = [...assignments];
    // Rotate right by 'actualSteps'
    const tail = rotated.splice(len - actualSteps, actualSteps);
    return [...tail, ...rotated];
};
