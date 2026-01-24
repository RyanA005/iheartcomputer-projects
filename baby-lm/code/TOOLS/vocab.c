
/* vocab.c
 * this simply output the entire vocab within the corpus
 */

#include "../includes.c"

int main(int argc, char **argv) {

    Corpus c;

    load_corpus("suess.txt", &c);

    int V = c.vocab_count;

	for (int i = 0; i < V; i++) {
		printf("%s\n", c.vocab[i]);
	}

}
