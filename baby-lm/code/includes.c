// includes.c

// this file includes typedefs, includes, and helpers used by our model

// inlcudes

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

// macros

#define LR 0.005
#define CONTEXT 6
#define HIDDEN 256

// structs

typedef struct {
    char **vocab;
    int *ids;
    int vocab_count;
	int token_count;
} Corpus;

typedef struct {
	int model_size;
    int vocab_size;
    int hidden_size;
    float *W1;  // [vocab_size, hidden_size]
    float *b1;  // [hidden_size]
    float *W2;  // [hidden_size, vocab_size]
    float *b2;  // [vocab_size]
} Model;


// math functions

float randf(float min, float max) {
    float scale = (float)rand() / (float)RAND_MAX; 
    return min + scale * (max - min); 
}

void softmax(float *z, float *p, int n) {
	if (n <= 0) return;
	float max = z[0];
	for (int i = 1; i < n; i++) if (z[i] > max) max = z[i];

	float sum = 0.0f;
	for (int i = 0; i < n; i++) {
		p[i] = expf(z[i] - max);
		sum += p[i];
	}

	if (sum == 0.0f) {
		float v = 1.0f / (float)n;
		for (int i = 0; i < n; i++) p[i] = v;
	} else {
		for (int i = 0; i < n; i++) p[i] /= sum;
	}
}

int sample(float *p, int n) {
    float r = (float)rand() / RAND_MAX;
    float sum = 0.0f;

    for (int i = 0; i < n; i++) {
        sum += p[i];
        if (r <= sum)
            return i;
    }
    return n - 1;
}

int lookup(char *word, Corpus *c) {
	for (int i = 0; i < c->vocab_count; i++) {
		if (c->vocab[i] && strcmp(c->vocab[i], word) == 0) return i;
	}
	return 0; // ? token
}

// helper functions

void load_corpus(char *path, Corpus *c) {

	int cap = 1000, max_tok_size = 50;
	int ch, c_count = 0;
	char **tokens;
	char buf[max_tok_size];

	// ensure corpus counters are initialized to avoid uninitialized writes
	c->token_count = 0;
	c->vocab_count = 0;
	
	// load corpus from path
	FILE * f = fopen(path, "r");
	if (!f) { perror("cannot read corpus"); exit(1); }

	// apply super simple tokenization 
	tokens = malloc(cap * sizeof(char*));
	while ((ch = getc(f)) >= 0) {

		if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '\'') {
			if (ch >= 'A' && ch <= 'Z') ch -= ('A' - 'a');
			buf[c_count++] = ch;
			if (c_count == max_tok_size) c_count = 0; // just discard overflow
		} else if (c_count > 0) {
			buf[c_count] = '\0';
			tokens[c->token_count++] = strdup(buf);
			c_count = 0;
		}

		if (c->token_count == cap) {
			cap *= 2;
			tokens = realloc(tokens, cap * sizeof(char*));
		}
	}
	fclose(f);
	
	// add unique tokens to vocab
	cap = 1000;
	c->vocab = malloc(cap * sizeof(char*));
	c->vocab[0] = "?"; // unknown
	c->vocab_count = 1;
	for (int i = 0; i < c->token_count; i++) {
		int found = 0;

		for (int j = 0; j < c->vocab_count; j++) {
			if (strcmp(tokens[i], c->vocab[j]) == 0) {
				found = 1;
				break;
			}
		}

		if (found == 0) {
			if (c->vocab_count == cap) {
				cap *= 2;
				c->vocab = realloc(c->vocab, cap * sizeof(char*));
			}
			c->vocab[c->vocab_count++] = strdup(tokens[i]);
		}
	}	
	// create ids array to convert tokens[index] = "some string" -> ids[index] = token index
	c->ids = malloc(sizeof(int) * c->token_count);
	for (int i = 0; i < c->token_count; i++) {
		int found = 0;
		for (int j = 0; j < c->vocab_count; j++) {
			if (strcmp(tokens[i], c->vocab[j]) == 0) {
				c->ids[i] = j;
				found = 1;
				break;
			}
		}
		if (!found) c->ids[i] = 0; // null token, maps to '?'
	}
	printf("corpus loaded: %d tokens, %d vocab\n", c->token_count, c->vocab_count);
}

void init_model(Model *m, Corpus *c) {
	m->vocab_size = c->vocab_count; 
	m->hidden_size = HIDDEN; 

	m->W1 = malloc(sizeof(float) * m->vocab_size * HIDDEN);
	m->b1 = malloc(sizeof(float) * HIDDEN); 

	m->W2 = malloc(sizeof(float) * HIDDEN * m->vocab_size); 
	m->b2 = malloc(sizeof(float) * m->vocab_size); 

	float scale = 1.0f / sqrtf((float)HIDDEN); 

	for (int i = 0; i < m->vocab_size * HIDDEN; i++) 
		m->W1[i] = randf(-scale, scale); // initialize embeddings
	for (int i = 0; i < HIDDEN * m->vocab_size; i++) 
		m->W2[i] = randf(-scale, scale); // initialize output weights 

	memset(m->b1, 0, sizeof(float) * HIDDEN); // biases start at 0
	memset(m->b2, 0, sizeof(float) * m->vocab_size); 

	m->model_size = m->vocab_size * HIDDEN + HIDDEN + HIDDEN * m->vocab_size + m->vocab_size; 

	printf("model initialized: %d vocab, %d hidden, %d params\n", m->vocab_size, m->hidden_size, m->model_size);
	
}

void save_model(char *path, Model *m) {
	FILE *f = fopen(path, "wb");
	if (!f) {
		perror("cannot save model");
		exit(1);
	}

	fwrite(&m->model_size, sizeof(int), 1, f);
	fwrite(&m->vocab_size, sizeof(int), 1, f);
	fwrite(&m->hidden_size, sizeof(int), 1, f);

	fwrite(m->W1, sizeof(float), m->vocab_size * m->hidden_size, f);
	fwrite(m->b1, sizeof(float), m->hidden_size, f);
	fwrite(m->W2, sizeof(float), m->hidden_size * m->vocab_size, f);
	fwrite(m->b2, sizeof(float), m->vocab_size, f);

	fclose(f);
}

void load_model(char *path, Model *m) {
	FILE *f = fopen(path, "rb");
	if (!f) {
		perror("cannot load model");
		exit(1);
	}

    fread(&m->model_size, sizeof(int), 1, f);
    fread(&m->vocab_size, sizeof(int), 1, f);
    fread(&m->hidden_size, sizeof(int), 1, f);

    int S = m->model_size;
    int V = m->vocab_size;
    int H = m->hidden_size;

	m->W1 = malloc(sizeof(float) * V * H);
	m->b1 = malloc(sizeof(float) * H);
	m->W2 = malloc(sizeof(float) * H * V);
	m->b2 = malloc(sizeof(float) * V);

	fread(m->W1, sizeof(float), V * H, f);
	fread(m->b1, sizeof(float), H, f);
	fread(m->W2, sizeof(float), H * V, f);
	fread(m->b2, sizeof(float), V, f);

    fclose(f);

	printf("model loaded: %d vocab, %d hidden, %d params\n", m->vocab_size, m->hidden_size, m->model_size);

}
