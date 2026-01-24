
/* embedding-outputs.c
 * this program reads command line input to get a list of tokens
 * for each token we print the first 10 values in the embedding vector
 * i use this program to show what the values in the model actually look like
 */

#include "../includes.c"

int main(int argc, char **argv) {

	int w_count = argc - 1;
	if (w_count < 1) {
		printf("usage ./%s <word> ...\n", argv[0]);
		exit(0);
	}

	Model m;
    Corpus c;

    load_corpus("suess.txt", &c);
	load_model("model.bin", &m);

	printf("\n");

    int *words = calloc(w_count, sizeof(int));
	for (int i = 0; i < w_count; i++) {
		char *w = argv[i+1];
		int w_id = lookup(w, &c);
		printf("%4d - %-5s= ", w_id, w);
		for (int j = 0; j < 10; j++) printf("%9f, ", m.W1[w_id * m.vocab_size + j]); // just print the first 10 W1 values
		printf("... \n\n");
	}
}
