#ifndef BP_SHAPE_H
#define BP_SHAPE_H

#include "cglm/cglm.h"

/**! @file shape.h
 @brief Shape structures and helper functions for physics collision detection.
*/

/**
 * @brief A simple Axis-Aligned Bounding Box (AABB) shape represented by a center point and half-extents.
 * The first vec3 is the center of the AABB, and the second vec3 is the half-extents (half the width, height, depth).
 */
typedef vec3 shape_aabb_t[2];

/**
 * @brief Creates an AABB shape from the given minimum and maximum corner points.
 *
 * @param min [in] minimum corner point (smallest x, y, z)
 * @param max [in] maximum corner point (largest x, y, z)
 * @param outAABB [out] the resulting AABB shape
 */
void shape_aabb_from_corners(const vec3 min, const vec3 max, shape_aabb_t outAABB);

/**
 * @brief Checks if two AABB shapes are overlapping (colliding) and optionally returns the overlap depth along each axis.
 *
 * @param a [in] the first AABB shape
 * @param b [in] the second AABB shape
 * @param outOverlap [out] the overlap depth along each axis (positive values indicate penetration depth)
 * @return 1 if the AABBs are overlapping, 0 otherwise
 */
int shape_aabb_overlap(const shape_aabb_t a, const shape_aabb_t b, vec3 outOverlap);

#endif /* BP_SHAPE_H */