// includes.c

// this file includes typedefs, includes, and helpers used by our model

// inlcudes

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

// macros

#define 

// structs

typedef struct {

} Model;


// math functions

float randf(float min, float max) {
    float scale = (float)rand() / (float)RAND_MAX; 
    return min + scale * (max - min); 
}

