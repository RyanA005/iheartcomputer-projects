// interpolate.c
// Create interpolations in latent space between two random dataset images

#include "includes.c"

int main(int argc, char **argv) {

    srand(time(NULL));

    Model m;
    Dataset d;

    load_model("model.bin", &m);
    load_dataset("emojis.bin", &d);

    int make_strip = 0;
    if (argc > 1 && strcmp(argv[1], "-s") == 0)
        make_strip = 1;

    // pick two random emojis
    int a = rand() % d.count;
    int b = rand() % d.count;

    float *imgA = &d.images[a * IMAGESIZE];
    float *imgB = &d.images[b * IMAGESIZE];
    
    save_bmp("a.bmp", imgA);
    save_bmp("b.bmp", imgB);

    float latentA[LATENT];
    float latentB[LATENT];
    float latent[LATENT];
    float image[IMAGESIZE];

    encode(&m, imgA, latentA);
    encode(&m, imgB, latentB);

    if (make_strip) {
        // single midpoint image
        float t = 0.5f;
        for (int j = 0; j < LATENT; j++)
            latent[j] = (1.0f - t) * latentA[j] + t * latentB[j];

        decode(&m, latent, image);
        save_bmp("image.bmp", image);

    } else {
        // 5-step interpolation
        int steps = 5;

        for (int s = 0; s < steps; s++) {

            float t = (float)s / (float)(steps - 1);

            for (int j = 0; j < LATENT; j++)
                latent[j] = (1.0f - t) * latentA[j] + t * latentB[j];

            decode(&m, latent, image);

            char name[16];
            sprintf(name, "%d.bmp", s + 1);
            save_bmp(name, image);
        }
    }

    return 0;
}
