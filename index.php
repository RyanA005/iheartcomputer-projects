<?php

function load_people(): array {
    $path = dirname(__DIR__) . '/people.json';
    if (!file_exists($path)) {
        return [];
    }

    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function load_project_metadata(string $dir): ?array {
    $path = $dir . '/metadata.json';
    if (!file_exists($path)) {
        return null;
    }

    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

function format_project_date(?string $date): string {
    if (!$date) {
        return '';
    }

    $timestamp = strtotime($date);
    return $timestamp ? date('M j, Y', $timestamp) : $date;
}

function project_thumbnail_src(string $slug, ?array $meta): string {
    $thumbnail = $meta['thumbnail'] ?? null;
    if (!$thumbnail) {
        return '/logo.png';
    }

    if (str_starts_with($thumbnail, '/')) {
        return $thumbnail;
    }

    return '/projects/' . $slug . '/' . $thumbnail;
}

function resolve_author(?string $authorId, array $people): ?array {
    if (!$authorId || !isset($people[$authorId])) {
        return null;
    }

    return [
        'id' => $authorId,
        'name' => $people[$authorId]['name'],
        'profile_url' => '/about/#' . $authorId,
    ];
}

$people = load_people();
$archive = ['vim-demo', 'iheartcomputer-template'];
$projects = [];

foreach (scandir('.') as $file) {
    if ($file === '.' || $file === '..' || !is_dir($file) || str_starts_with($file, '.')) {
        continue;
    }

    if (in_array($file, $archive, true)) {
        continue;
    }

    $meta = load_project_metadata($file);
    if ($meta && array_key_exists('listed', $meta) && $meta['listed'] === false) {
        continue;
    }

    $authorId = is_string($meta['author'] ?? null) ? $meta['author'] : null;

    $projects[] = [
        'slug' => $file,
        'title' => $meta['title'] ?? str_replace('-', ' ', $file),
        'subtitle' => $meta['subtitle'] ?? '',
        'topics' => $meta['topics'] ?? [],
        'author' => resolve_author($authorId, $people),
        'date' => $meta['date'] ?? null,
        'thumbnail' => project_thumbnail_src($file, $meta),
        'video' => $meta['video'] ?? null,
    ];
}

usort($projects, function (array $a, array $b): int {
    return strcmp($b['date'] ?? '', $a['date'] ?? '');
});

?>

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="IHEARTCOMPUTER - Public Projects Page">
  <title>IHEARTCOMPUTER</title>
  <link rel="icon" type="image/x-icon" href="/logo.png">
  <link rel="stylesheet" href="/styles.css">
  <style>
    .projects-page { width:100%; max-width:1100px; margin:0 auto; padding:0 10px 20px; align-items:stretch; text-align:left; }
    .projects-footer { margin-top:28px; align-self:center; text-align:center; }
    .project-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px; width:100%; }
    .project-card { display:flex; flex-direction:column; border:1px solid #ccc; border-radius:6px; overflow:hidden; background:#fff; }
    .project-card:hover { border-color:#888; box-shadow:0 4px 14px rgba(0,0,0,.08); }
    .project-card-link { display:flex; flex-direction:column; flex:1; color:inherit; text-decoration:none; }
    .project-card-image { aspect-ratio:16/9; background:#f4f4f4; overflow:hidden; }
    .project-card-image img { width:100%; height:100%; object-fit:cover; display:block; }
    .project-card-body { display:flex; flex-direction:column; gap:8px; padding:14px 16px 16px; }
    .project-card-title { margin:0; font-size:1.25rem; line-height:1.3; }
    .project-card-subtitle { margin:0; font-size:.95rem; color:#555; }
    .project-card-topics { display:flex; flex-wrap:wrap; gap:6px; }
    .project-topic { font-size:.75rem; padding:3px 8px; border:1px solid #ddd; border-radius:999px; background:#fafafa; color:#444; }
    .project-card-meta { display:flex; flex-wrap:wrap; gap:8px 14px; padding:0 16px 14px; font-size:.85rem; color:#666; }
  </style>
</head>
<body>
  <div class="main">
    <header class="header">
      <div class="title">
        <strong class="large" style="align-self: flex-start;">I<span style="color: #e00;">♥</span>COMPUTER</strong>
      </div>
      <nav class="nav">
        <a class="link" href="/">home</a>
        <a class="link" href="https://discord.gg/JpRw84Ybwg" target="_blank">discord</a>
        <a class="link" href="/projects/">projects</a>
      </nav>
    </header>

    <hr class="break">

    <div class="content projects-page">
      <div class="large">Projects</div>
      <br> 
      <div class="project-grid">
        <?php foreach ($projects as $project): ?>
          <article class="project-card">
            <a class="project-card-link" href="<?= htmlspecialchars($project['slug']) ?>/">
              <div class="project-card-image">
                <img
                  src="<?= htmlspecialchars($project['thumbnail']) ?>"
                  alt="<?= htmlspecialchars($project['title']) ?>"
                  loading="lazy"
                >
              </div>
              <div class="project-card-body">
                <h2 class="project-card-title"><?= htmlspecialchars($project['title']) ?></h2>
                <?php if ($project['subtitle']): ?>
                  <p class="project-card-subtitle"><?= htmlspecialchars($project['subtitle']) ?></p>
                <?php endif; ?>

                <?php if (!empty($project['topics'])): ?>
                  <div class="project-card-topics">
                    <?php foreach (array_slice($project['topics'], 0, 3) as $topic): ?>
                      <span class="project-topic"><?= htmlspecialchars($topic) ?></span>
                    <?php endforeach; ?>
                  </div>
                <?php endif; ?>
              </div>
            </a>

            <div class="project-card-meta">
              <?php if (!empty($project['author']['name'])): ?>
                <span>
                  by
                  <a class="link project-card-author" href="<?= htmlspecialchars($project['author']['profile_url']) ?>">
                    <?= htmlspecialchars($project['author']['name']) ?>
                  </a>
                </span>
              <?php endif; ?>
              <?php if ($project['date']): ?>
                <span><?= htmlspecialchars(format_project_date($project['date'])) ?></span>
              <?php endif; ?>
              <?php if (!empty($project['video'])): ?>
                <a class="link project-card-video" href="<?= htmlspecialchars($project['video']) ?>" target="_blank" rel="noopener noreferrer">watch recording</a>
              <?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      </div>

      <p class="medium projects-footer">more coming soon!</p>
    </div>

    <hr class="break">
  </div>
</body>
</html>
