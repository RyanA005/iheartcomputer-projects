// reconstruct.c
// reconstruct an image using a trained model.bin and emojis.bin dataset 

#include "includes.c"

int main() {

    srand(time(NULL));

    Model m;
    Dataset d;

    load_model("model.bin", &m);
    load_dataset("emojis.bin", &d);

    // pick a random emoji
    int idx = rand() % d.count;
    float *img = &d.images[idx * IMAGESIZE];
    save_bmp("image-original.bmp", img);

    float image[IMAGESIZE];
    reconstruct(&m, img, image);

    save_bmp("image.bmp", image);

    return 0;
}
