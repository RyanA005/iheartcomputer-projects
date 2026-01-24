<?php
// hello :)
?>

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Vim-101</title>
  <link rel="icon" type="image/x-icon" href="/logo.png">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="main">
    <header class="header">
      <div class="title">
        <strong class="large" style="align-self: flex-start;">Vim-101</strong>
      </div>
      <nav class="nav">
        <div class="medium">By - <a class="link" href="https://ryanhub.org/me">Ryan Alport</a></div>
      </nav>
    </header>

    <hr class="break">

    <div class="content">

      <section id="title">
        <strong class="large">How to Vim</strong><br><br>
        <img src="images/vim-logo.svg" style="max-width: 20vw"><br><br>
        <div class="medium">text editing & a case for mastering everything you do</div><br>
      </section><hr class="break">

      <br><br><br><br>

      <section id="history">
        <strong class="large">What is Vim?</strong><br><br>
        <div class="medium">Vim is an old school <a class="link" href="https://en.wikipedia.org/wiki/Unix">unix</a> text editor</div><br>
        <img src="images/vim-home.webp" style="max-width: 40vw"><br><br>
        <div class="small">it lives inside the terminal, ideal for editing files on computers that may not have GUIs</div><br>
        <div class="small">it also has a modern cult following consisting of individuals obsessed with fast and efficient text manipulation</div><br>
        <div class="small">there are a number of different ways to interact with Vim today, from the classic vi in Linux to VS-Code extensions to neovim</div><br>
      </section><hr class="break">
    
      <br><br><br><br>

      <section id="intro">
        <strong class="large">Whats With Those Weirdos Still Using it?</strong><br><br>
        <div class="small">i am not weird...</div><br>
        <img src="images/vim-club.webp" style="max-width: 40vw"><br><br>
        <div class="small">Vim is built with a number of 'modes' which allow you to get crazy in your terminal</div><br>
        <div class="medium">Modes<div>
        <div class="small"><strong>Normal</strong> - text processing</div>
        <div class="small"><strong>Command</strong> - editor + terminal commands</div>
        <div class="small"><strong>Visual</strong> - selecting</div>
        <div class="small"><strong>Insert</strong> - actually typing</div>
        <br>
        <div class="medium">Normal mode commands<div>
        <div class="small"><strong>h,j,k,l</strong> -> arrow keys</div>
        <div class="small"><strong>e,w,b</strong> -> better arrow keys</div>
        <div class="small"><strong>d,y,r,p</strong> -> cut, copy, replace, paste </div>
        <div class="small"><strong>0/^,$,gg,G</strong> -> start of line, end of line, top of file, bottom of file </div>
        <div class="small"><strong>{,},f,/<>+n</strong> -> start of paragraph, end of paragraph, next occurence of, nth occurence of</div>
        <div class="small"><strong>dt<>,vi{/(/[,ciw</strong> -> delete up to, select inside of, replace word</div>
        <img src="images/vim-cheatsheet.png" style="max-width: 40vw">
        <div class="small">you get the idea...</div>
      </section><hr class="break">

      <br><br><br><br>

      <section id="demo">
        <strong class="large">Lets Practice</strong><br><br>
        <div class="small">
		see the
		<a class="link" href="sample.py"> sample python </a> & 
		<a class="link" href="sample.c"> sample c <a/>
		in this directory!
	</div><br><br>
        <img src="images/vim-power.png" style="max-width: 30vw"><br><br>
      </section><hr class="break">

      <br><br><br><br>

      <section id="exit">
        <strong class="large">Exiting Vim</strong><br><br>
        <div class="small">perhaps the most controversial and difficult aspect...</div><br><br>
        <div style="display:flex; flex-direction:row; justify-self:center; justify-content:center;">
          <img src="images/exit-vim.avif" style="max-width: 30vw">
          <img src="images/vim-curve.png" style="max-width: 30vw">
        </div><br><br>
      </section><hr class="break">

      <br><br><br><br>

      <section id="conclusion">
        <strong class="large">Whats the Point?</strong><br><br>
        <div class="medium">"Wow Ryan, you are not only <strong>very</strong> tall and <strong>very</strong> handsome but you have fully convinced me that I should use this text editor from the 70's"</div><br><br>
        <strong class="large">Do not lie to me.</strong><br><br>
        <div class="small">I do not expect most of you to actually care about Vim, but what Vim represents should be important to us all</div><br>
        <div class="small">Vim is a metaphor for intentional mastery of the tools you interact with every day</div><br>
        <div class="small">Every day, I write code in the terminal. I will spend thousands of hours doing it during my life</div><br>
        <div class="small">If youre going to do anything, especially something you love, become a master at it</div><br>
        <div class="small">You will be surprised how far being 1% faster will take you over the course of a lifetime</div><br>
        <strong class="large">Go Out There and Get Insanely Good at Whatever You Do!</strong><br><br>
        <div class="small">It does not need to be using a pretentious text editor</div><br>
        <div class="small">If you leave here saying <strong>"I should learn one shortcut for that tool I use"</strong> then I have won</div><br>
        <div class="small">I also hope I have made the case that Vim is the best text editor on Gods green earth and no one uses nano anymore....</div><br>
      </section><hr class="break">

      <br><br><br><br>

      <section id="thank-you">
        <strong class="large">Thank You For Listening!</strong><br><br>
        <div class="medium">Go master something!</div>
        <img src="images/heart.gif" style="max-width: 30vw"><br><br>
      </section><hr class="break">

      <br><br><br><br>

      <section id="links">
        <div class="large">links:</div><br>
        <div class="medium"><a class="link" href="README.md">readme</a></div><br>
        <div class="medium"><a class="link" href="https://www.ryanhub.org/repos/iheartcomputer-projects.git">repository</a></div><br>
        <div class="medium"><a class="link" href="/">IHC - home</a></div><br>
      </section>

      <br><br><br><br>

    </div>

    <hr class="break">

  </div>
</body>
</html>
