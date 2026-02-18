this very simple image autoencoder is written by Ryan Alport for demo use

in order to run, clone the repo, then simply compile an exectuable from train.c
no linker, no cross platform quirks (yay!)

training expects a file called emojis.bin to exist as the training dataset
you can create emojis.bin by running the python script in the same directory as a folder called images/ which contains pngs to train the model on.

after training the model will write itself to a file called model.bin 
all the generation tools expect to find this file

use reconstruct and the other tools to visualise results and to play with the
latent space once you have a model.bin and emojis.bin file

optimal training with this setup is a little difficult, for only face emojis ive seen decent results with 0.0001 LR, 50k training steps, and ~100 face emojis

this project is built to demonstrate basic principles and show how a tiny autoencoder can learn a compact representation of a small image dataset

the accompanying presentation can be found here:
https://iheartcomputer.club/projects/baby-image-gen/

reach out to me at ralport2005@gmail.com with any questions at all!