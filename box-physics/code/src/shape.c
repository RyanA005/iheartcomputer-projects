#include "box_physics/shape.h"

void shape_aabb_from_corners(const vec3 min, const vec3 max, shape_aabb_t outAABB) {
    int i;
    for (i = 0; i < 3; i++) {
        outAABB[0][i] = (min[i] + max[i]) * 0.5f;
        outAABB[1][i] = (max[i] - min[i]) * 0.5f;
    }
}

int shape_aabb_overlap(const shape_aabb_t a, const shape_aabb_t b, vec3 outOverlap) {
    int i;
    float delta;
    for (i = 0; i < 3; i++) {
        delta = fabsf(a[0][i] - b[0][i]) - (a[1][i] + b[1][i]);
        if (delta >= 0.0f) {
            return 0; // No overlap
        }
        if (outOverlap) {
            outOverlap[i] = -delta; // Store overlap depth
        }
    }
    return 1; // Overlap
}
