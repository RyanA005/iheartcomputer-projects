#ifndef BP_PHYSICS_H
#define BP_PHYSICS_H

#include <stddef.h>

/** @file physics.h
 *  @brief Main interface for the Box Physics engine.
 *
 *  This header defines the main functions for initializing, updating, and deinitializing the physics engine.
 *  It serves as the primary entry point for users of the Box Physics library.
 */

/**
 * @brief Initializes the physics engine with the specified number of bodies.
 *
 * This function sets up the necessary data structures and resources for the physics engine to operate.
 * It should be called before any other physics functions are used.
 *
 * @param numBodies The initial number of bodies that the physics engine should be prepared to handle.
 */
void physics_init(size_t numBodies);

/**
 * @brief Deinitializes the physics engine, freeing all allocated resources.
 *
 * This function should be called when the physics engine is no longer needed to clean up resources.
 * After calling this function, the physics engine cannot be used until it is initialized again.
 */
void physics_deinit(void);

/**
 * @brief Updates the physics simulation by a given time step.
 *
 * This function advances the physics simulation by the specified delta time, updating the positions,
 * velocities, and handling collisions of all bodies in the simulation.
 *
 * @param deltaTime The time step in seconds to advance the simulation.
 */
void physics_update(float deltaTime);

#endif /* BP_PHYSICS_H */