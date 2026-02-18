// includes.c

// this file includes typedefs, includes, and helpers used by our model

// inlcudes

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

// macros

#define LR 0.0001f
#define W 32
#define H 32
#define C 3
#define IMAGESIZE (W*H*C)
#define LATENT 512

// structs

typedef struct {
    float *w1; // IMAGESIZE x LATENT
    float *b1; // LATENT
    float *w2; // LATENT x IMAGESIZE
    float *b2; // IMAGESIZE
} Model;

typedef struct {
    int count;
    float *images;
} Dataset;

// math functions

float randf(float min, float max) {
    float scale = (float)rand() / (float)RAND_MAX; 
    return min + scale * (max - min); 
}

float gauss() {
    return (randf(0,1) + randf(0,1) + randf(0,1) - 1.5f);
}

// model tools

void encode(Model *m, float *input, float *latent) {
    for (int j = 0; j < LATENT; j++) {
        float sum = m->b1[j];
        for (int i = 0; i < IMAGESIZE; i++)
            sum += input[i] * m->w1[i*LATENT + j];
        latent[j] = tanhf(sum);
    }
}

void decode(Model *m, float *latent, float *out) { 
	for (int i = 0; i < IMAGESIZE; i++) { 
		float sum = m->b2[i]; 
		for (int j = 0; j < LATENT; j++) 
			sum += latent[j] * m->w2[j*IMAGESIZE + i]; 
		out[i] = 0.5f * (tanhf(sum) + 1.0f); 
	} 
}

void reconstruct(Model *m, float *input, float *out) {
    float latent[LATENT];
    encode(m, input, latent);
    decode(m, latent, out);
}

// helpers

void init_model(Model *m) {
    m->w1 = malloc(sizeof(float) * IMAGESIZE * LATENT);
    m->b1 = malloc(sizeof(float) * LATENT);
    m->w2 = malloc(sizeof(float) * LATENT * IMAGESIZE);
    m->b2 = malloc(sizeof(float) * IMAGESIZE);

    for (int i = 0; i < IMAGESIZE * LATENT; i++)
        m->w1[i] = randf(-0.01f, 0.01f);

    for (int i = 0; i < LATENT; i++)
        m->b1[i] = 0;

    for (int i = 0; i < LATENT * IMAGESIZE; i++)
        m->w2[i] = randf(-0.01f, 0.01f);

    for (int i = 0; i < IMAGESIZE; i++)
        m->b2[i] = 0;
}

void save_model(char *path, Model *m) {
    FILE *f = fopen(path, "wb");
    if (!f) return;

    fwrite(m->w1, sizeof(float), IMAGESIZE * LATENT, f);
    fwrite(m->b1, sizeof(float), LATENT, f);
    fwrite(m->w2, sizeof(float), LATENT * IMAGESIZE, f);
    fwrite(m->b2, sizeof(float), IMAGESIZE, f);

    fclose(f);
}

void load_model(char *path, Model *m) {
    FILE *f = fopen(path, "rb");
    if (!f) {
        printf("failed to open model\n");
        exit(1);
    }

    m->w1 = malloc(sizeof(float) * IMAGESIZE * LATENT);
    m->b1 = malloc(sizeof(float) * LATENT);
    m->w2 = malloc(sizeof(float) * LATENT * IMAGESIZE);
    m->b2 = malloc(sizeof(float) * IMAGESIZE);

    fread(m->w1, sizeof(float), IMAGESIZE * LATENT, f);
    fread(m->b1, sizeof(float), LATENT, f);
    fread(m->w2, sizeof(float), LATENT * IMAGESIZE, f);
    fread(m->b2, sizeof(float), IMAGESIZE, f);

    fclose(f);
}

void load_dataset(char *path, Dataset *d) {
    FILE *f = fopen(path, "rb");
    if (!f) {
        printf("failed to open dataset\n");
        exit(1);
    }

    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    rewind(f);

    d->count = size / (IMAGESIZE * sizeof(float));

    d->images = malloc(size);
    fread(d->images, 1, size, f);
    fclose(f);

    printf("loaded %d images\n", d->count);
}

void save_bmp(const char *filename, float *image) {
    FILE *f = fopen(filename, "wb");
    if (!f) return;

    int row_size = (3 * W + 3) & ~3;   // row padded to multiple of 4 bytes
    int pixel_data_size = row_size * H;
    int file_size = 54 + pixel_data_size;

    unsigned char header[54] = {0};

    // BMP header
    header[0] = 'B';
    header[1] = 'M';

    // file size
    header[2] = file_size;
    header[3] = file_size >> 8;
    header[4] = file_size >> 16;
    header[5] = file_size >> 24;

    // pixel data offset
    header[10] = 54;

    // DIB header size
    header[14] = 40;

    // width
    header[18] = W;
    header[19] = W >> 8;
    header[20] = W >> 16;
    header[21] = W >> 24;

    // height
    header[22] = H;
    header[23] = H >> 8;
    header[24] = H >> 16;
    header[25] = H >> 24;

    // planes
    header[26] = 1;

    // bits per pixel
    header[28] = 24;

    fwrite(header, 1, 54, f);

    unsigned char row[row_size];

    for (int y = H - 1; y >= 0; y--) {
        for (int x = 0; x < W; x++) {
            int i = (y * W + x) * 3;

            float r = image[i + 0];
            float g = image[i + 1];
            float b = image[i + 2];

            if (r < 0) r = 0; if (r > 1) r = 1;
            if (g < 0) g = 0; if (g > 1) g = 1;
            if (b < 0) b = 0; if (b > 1) b = 1;

            row[x * 3 + 2] = (unsigned char)(r * 255);
            row[x * 3 + 1] = (unsigned char)(g * 255);
            row[x * 3 + 0] = (unsigned char)(b * 255);
        }

        // zero padding
        for (int i = W * 3; i < row_size; i++)
            row[i] = 0;

        fwrite(row, 1, row_size, f);
    }

    fclose(f);
}
