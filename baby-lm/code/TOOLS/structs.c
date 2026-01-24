
/* structs.c
 * this program simply prints out some of our model stats
 */

#include "../includes.c"

#define N 3

int main() {

	Model m;
    Corpus c;;

    load_corpus("suess.txt", &c);
	printf("\nvocab: [ ");
	for (int i = 1; i <= N; i++) printf("%d: %s, ", i, c.vocab[i]);
	printf("%d: %s ]\n", N+1, c.vocab[N+1]);

	printf("\nids: [ ");
	int pos = 500;
	for (int i = 0; i < N; i++) {
		printf("%d: %d, ", pos + i, c.ids[pos + i]);
	}
	printf("%d: %d ]\n	", pos + N, c.ids[pos + N]);

	for (int i = 0; i < N; i++) {
		printf("%d=\"%s\", ", c.ids[pos+i], c.vocab[c.ids[pos + i]]);
	}
	printf("%d=\"%s\"\n", c.ids[pos+N], c.vocab[c.ids[pos + N]]);

	printf("\nvocab_count: %d\ntoken_count: %d\n\n", c.vocab_count, c.token_count);


	load_model("TRAINED/model.bin", &m);
	printf("\nmodel_size:  %d\n", m.model_size);
	printf("vocab_size:  %d\n", m.vocab_size);
	printf("hidden_size: %d\n", m.hidden_size);
}
