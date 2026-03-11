cmake_minimum_required(VERSION 3.22)

set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)
if(PLATFORM STREQUAL "Web")
    set(CMAKE_C_EXTENSIONS ON)
else()
    set(CMAKE_C_EXTENSIONS OFF)
endif()

set(LOCAL_PROJECT_NAME "box_physics")
set(LOCAL_PROJECT_VERSION "0.1.0")
set(LOCAL_PROJECT_DESCRIPTION "A very simple educational 3D physics library for learning purposes.")

option(BP_BUILD_SHARED "Build shared instead of static libraries" OFF)
option(BP_BUILD_CLIENT "Build the test client application" ON)

set(PLATFORM "Desktop" CACHE STRING "Platform to build for")

project(${LOCAL_PROJECT_NAME}
        VERSION ${LOCAL_PROJECT_VERSION}
        DESCRIPTION ${LOCAL_PROJECT_DESCRIPTION}
        LANGUAGES C
)

message(STATUS "Building for platform: ${PLATFORM}")

# Library
set(SOURCES
        src/buffer.c
        src/collision.c
        src/collision_internal.h
        src/physics.c
        src/rigidbody.c
        src/rigidbody_internal.h
        src/shape.c
)

set(HEADERS
        include/box_physics/buffer.h
        include/box_physics/collision.h
        include/box_physics/common.h
        include/box_physics/physics.h
        include/box_physics/rigidbody.h
        include/box_physics/shape.h
)

if (BP_BUILD_SHARED)
    set(BUILD_SHARED_LIBS ON)
else()
    set(BUILD_SHARED_LIBS OFF)
endif()

add_library(${LOCAL_PROJECT_NAME} ${SOURCES} ${HEADERS})

target_include_directories(${LOCAL_PROJECT_NAME}
        PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

if (PLATFORM STREQUAL "Web")
    target_compile_definitions(${LOCAL_PROJECT_NAME} PRIVATE BP_PLATFORM_WEB)
elseif (PLATFORM STREQUAL "Desktop")
    target_compile_definitions(${LOCAL_PROJECT_NAME} PRIVATE BP_PLATFORM_DESKTOP)
endif()

# Dependency - CGLM
include(FetchContent)

FetchContent_Declare(
        cglm
        GIT_REPOSITORY https://github.com/recp/cglm.git
        GIT_TAG v0.9.6
)

FetchContent_MakeAvailable(cglm)

target_link_libraries(${LOCAL_PROJECT_NAME} PUBLIC cglm)

# Client
if (BP_BUILD_CLIENT)

    set(RAYLIB_VERSION 5.5)

    FetchContent_Declare(
            raylib
            DOWNLOAD_EXTRACT_TIMESTAMP OFF
            URL https://github.com/raysan5/raylib/archive/refs/tags/${RAYLIB_VERSION}.tar.gz
    )

    FetchContent_MakeAvailable(raylib)

    add_executable(test_client client/src/client.c)

    target_link_libraries(test_client PRIVATE ${LOCAL_PROJECT_NAME} raylib)

    target_include_directories(test_client PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)

endif()