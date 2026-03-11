<?php
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

    <div class="content">

	<div class="large">Projects</div><br>
    
	<?php 
    $archive = ["vim-demo", "iheartcomputer-template"]; // still avaliable but not listed
	$files = scandir('.');
	foreach ($files as $file) {
        if ($file != '.' && $file != '..' && is_dir($file) && !str_starts_with($file, '.') && !in_array($file, $archive)) { 
	        echo '<li><a class="medium link" href=' . $file . '>'. $file . '</a></li><br>';
	    }
	}
	?>
	<br>
	
	
	<div class="medium">more coming soon!</div><br>

    </div>

    <hr class="break">

  </div>
</body>
</html>
