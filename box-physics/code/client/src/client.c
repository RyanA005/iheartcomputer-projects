#include <string.h>

#include "raylib.h"
#include "box_physics/physics.h"
#include "box_physics/rigidbody.h"

#define GRAVITY 15.0f

typedef struct cube_s {
    Vector3 position;
    Vector3 size;
    Color color;
    rigidbody_t *rigidbody;
    uint8_t _inUse;
} cube_t;

typedef struct cube_manager_s {
    cube_t *cubes;
    size_t count;
    size_t capacity;
} cube_manager_t;

cube_manager_t cube_manager;

void cube_manager_init(cube_manager_t* manager, const size_t initialCapacity) {
    manager->cubes = calloc(initialCapacity, sizeof(cube_t));
    if (!manager->cubes) {
        free(manager);
        return;
    }

    manager->count = 0;
    manager->capacity = initialCapacity;
}

void cube_manager_deinit(const cube_manager_t* manager) {
    free(manager->cubes);
}

cube_t* create_cube(const cube_manager_t* manager, const Vector3 position, const Vector3 size, Color color, const float mass) {
    cube_t *cube;
    rigidbody_t *rb;
    if (manager->count >= manager->capacity) {
        return NULL; // No more cubes can be created
    }

    for (size_t i = 0; i < manager->capacity; i++) {
        if (!manager->cubes[i]._inUse) {
            cube = &manager->cubes[i];

            cube->position = position;
            cube->size = size;
            cube->color = color;
            rb = cube->rigidbody = rigidbody_create();
            cube->_inUse = 1;

            rigidbody_init(rb, (vec3){position.x, position.y, position.z}, mass, (vec3){size.x, size.y, size.z}, RB_FLAG_DYNAMIC);

            return cube;
        }
    }

    return NULL; // Should never reach here
}

void destroy_cube(cube_t* cube) {
    if (!cube || !cube->_inUse) {
        return; // Invalid cube
    }

    rigidbody_destroy(cube->rigidbody);
    cube->_inUse = 0;
}

void update_cube(cube_t* cube) {
    if (!cube || !cube->_inUse) {
        return; // Invalid cube
    }

    rigidbody_add_force(cube->rigidbody, (vec3){0, -GRAVITY, 0}); // Apply gravity

    cube->position = (Vector3){
        cube->rigidbody->position[0],
        cube->rigidbody->position[1],
        cube->rigidbody->position[2]
    }; // Sync position with rigidbody
}

void draw_cube(cube_t* cube) {
    if (!cube || !cube->_inUse) {
        return; // Invalid cube
    }

    DrawCube(cube->position, cube->size.x, cube->size.y, cube->size.z, cube->color);
    DrawCubeWires(cube->position, cube->size.x, cube->size.y, cube->size.z, BLACK);
}

void update_all_cubes(cube_manager_t* manager) {
    if (!manager) {
        return; // Invalid manager
    }

    for (size_t i = 0; i < manager->capacity; i++) {
        if (manager->cubes[i]._inUse) {
            update_cube(&manager->cubes[i]);
        }
    }
}

void draw_all_cubes(cube_manager_t* manager) {
    if (!manager) {
        return; // Invalid manager
    }

    for (size_t i = 0; i < manager->capacity; i++) {
        if (manager->cubes[i]._inUse) {
            draw_cube(&manager->cubes[i]);
        }
    }
}

void apply_input_to_player(cube_t* player_cube) {
    if (!player_cube || !player_cube->_inUse) {
        return; // Invalid player cube
    }

    rigidbody_t *rb = player_cube->rigidbody;
    const float moveForce = 1.5f;

    if (IsKeyDown(KEY_W)) {
        rigidbody_add_impulse(rb, (vec3){0, 0, -moveForce});
    }
    if (IsKeyDown(KEY_S)) {
        rigidbody_add_impulse(rb, (vec3){0, 0, moveForce});
    }
    if (IsKeyDown(KEY_A)) {
        rigidbody_add_impulse(rb, (vec3){-moveForce, 0, 0});
    }
    if (IsKeyDown(KEY_D)) {
        rigidbody_add_impulse(rb, (vec3){moveForce, 0, 0});
    }
    if (IsKeyDown(KEY_SPACE)) {
        rigidbody_add_impulse(rb, (vec3){0, moveForce * 2.0f, 0});
    }
}

void scene_wall_test(cube_manager_t *manager);
void scene_stress_test(cube_manager_t *manager);
void scene_pyramid_test(cube_manager_t *manager);

//------------------------------------------------------------------------------------
// Program main entry point
//------------------------------------------------------------------------------------
int main(int argc, char *argv[])
{
    // Initialization
    //--------------------------------------------------------------------------------------
    const int screenWidth = 1020*2;
    const int screenHeight = 760*2;

    cube_t *player_cube = NULL;

    InitWindow(screenWidth, screenHeight, "physics demonstration");

    // Define the camera to look into our 3d world
    Camera3D camera = { 0 };
    camera.position = (Vector3){ 0.0f, 10.0f, 10.0f };  // Camera position
    camera.target = (Vector3){ 0.0f, 0.0f, 0.0f };      // Camera looking at point
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };          // Camera up vector (rotation towards target)
    camera.fovy = 45.0f;                                // Camera field-of-view Y
    camera.projection = CAMERA_PERSPECTIVE;             // Camera mode type

    SetTargetFPS(60);               // Set our game to run at 60 frames-per-second
    //--------------------------------------------------------------------------------------

    physics_init(2048);
    cube_manager_init(&cube_manager, 2048);

    int scene = argc > 1 ? atoi(argv[1]) : 1;
    switch (scene) {
        case 1:
            scene_wall_test(&cube_manager);
            break;
        case 2:
            player_cube = create_cube(&cube_manager, (Vector3){0, 0, 0}, (Vector3){1, 1, 1}, BLUE, 20.0f);
            create_cube(&cube_manager, (Vector3){3, 0, 0}, (Vector3){1, 1, 1}, RED, 10.0f);
            create_cube(&cube_manager, (Vector3){-3, 0, 0}, (Vector3){1, 1, 1}, RED, 10.0f);
            create_cube(&cube_manager, (Vector3){0, -2, 0}, (Vector3){10, 1, 10}, GREEN, 0.0f);
            break;
        case 3:
            scene_stress_test(&cube_manager);
            break;
        case 4:
            scene_pyramid_test(&cube_manager);
            break;
        default:
            break;
    }

    // Main game loop
    while (!WindowShouldClose())    // Detect window close button or ESC key
    {
        // Update
        physics_update(GetFrameTime());

        update_all_cubes(&cube_manager);
        if (player_cube) apply_input_to_player(player_cube);

        // Draw
        //----------------------------------------------------------------------------------
        BeginDrawing();

            ClearBackground(RAYWHITE);

            BeginMode3D(camera);

                draw_all_cubes(&cube_manager);

                DrawGrid(10, 1.0f);

            EndMode3D();

            DrawFPS(10, 10);

        EndDrawing();
        //----------------------------------------------------------------------------------
    }

    // De-Initialization
    //--------------------------------------------------------------------------------------
    CloseWindow();        // Close window and OpenGL context
    //--------------------------------------------------------------------------------------

    cube_manager_deinit(&cube_manager);
    physics_deinit();

    return 0;
}

void scene_wall_test(cube_manager_t *manager)
{
    const int wallWidth = 6;
    const int wallHeight = 6;
    const float spacing = 1.05f;

    Vector3 cubeSize = {1,1,1};

    Vector3 lowPos = {
        0,
        0,
        0
    };

    create_cube(manager, lowPos, (Vector3){15,1, 15}, GREEN, 0.0f);

    // Build cube wall
    for (int z = 2; z > -10; z -= 4)
    for (int y = 0; y < wallHeight; y++)
    {
        for (int x = 0; x < wallWidth; x++)
        {
            Vector3 pos = {
                x * spacing - (wallWidth * spacing) * 0.5f,
                y * spacing + 0.5f,
                z
            };

            cube_t *c = create_cube(manager, pos, cubeSize, RED, 5.0f);
            if (c)
                c->rigidbody->flags |= RB_FLAG_DYNAMIC;
        }
    }

    // Create projectile cube
    cube_t *projectile = create_cube(
        manager,
        (Vector3){5, 3, 8},   // start position
        (Vector3){1.2f,1.2f,1.2f},
        BLUE,
        40.0f                 // heavy cube
    );

    if (projectile) {
        projectile->rigidbody->flags |= RB_FLAG_DYNAMIC;

        // Launch it toward the wall
        rigidbody_add_impulse(projectile->rigidbody, (vec3){-200.0f, 0, -250.0f});
    }
}

void scene_stress_test(cube_manager_t *manager) {
    const int numCubes = 1000;
    const float areaSize = 4;

    Vector3 cubeSize = {.25f,.25f,.25f};

    Vector3 lowPos = {
        0,
        0,
        0
    };

    create_cube(manager, lowPos, (Vector3){15,1, 15}, GREEN, 0.0f);

    for (int i = 0; i < numCubes; i++) {
        Vector3 pos = {
            (float)GetRandomValue(-areaSize*100, areaSize*100) * 0.01f,
            (float)GetRandomValue(0, 5000) * 0.01f,
            (float)GetRandomValue(-areaSize*100, areaSize*100) * 0.01f
        };

        cube_t *c = create_cube(manager, pos, cubeSize, RED, 5.0f);
    }
}

void scene_pyramid_test(cube_manager_t *manager) {
    const int baseSize = 10;
    const float spacing = 1.05f;

    Vector3 cubeSize = {1,1, 1};

    Vector3 lowPos = {
        0,
        0,
        0
    };

    create_cube(manager, lowPos, (Vector3){15,1, 15}, GREEN, 0.0f);

    for (int y = 0; y < baseSize; y++)
    {
        int rowSize = baseSize - y;
        for (int x = 0; x < rowSize; x++)
        {
            Vector3 pos = {
                x * spacing - (rowSize * spacing) * 0.5f,
                y * spacing + 0.5f,
                0
            };

            cube_t *c = create_cube(manager, pos, cubeSize, RED, 5.0f);
            if (c)
                c->rigidbody->flags |= RB_FLAG_DYNAMIC;
        }
    }
}