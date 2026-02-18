// random.c
// generates fully random latent vectors

#include "includes.c"

int main() {

    srand(time(NULL));

    Model m;
    load_model("model.bin", &m);

    float latent[LATENT];
    for (int j = 0; j < LATENT; j++) {
        latent[j] = randf(-1, 1);
    }

    float image[IMAGESIZE];
    decode(&m, latent, image);

    save_bmp("image.bmp", image);

    return 0;
}
