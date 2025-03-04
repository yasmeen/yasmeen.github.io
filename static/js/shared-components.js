document.addEventListener("DOMContentLoaded", function () {
  // Get the current page path
  const path = window.location.pathname;

  // Determine the active page based on the path
  let activePage = "index"; // Default to index/work

  if (path.includes("/projects")) {
    activePage = "projects";
  } else if (path.includes("/about")) {
    activePage = "about";
  }

  // Create the header HTML
  const headerHTML = `
    <!-- START: SHARED HEADER -->
    <div class="ten wide column">
      <a class="myName" href="/"><h1>Hi, I'm Yasmeen!</h1></a>
      <br>
      <p>
        I'm a hackathon-obsessed software engineer exploring fun & futuristic ideas. I previously worked at <a class="hookxyz workLink" href="https://hook.xyz">Hook</a>, <a class="oscar workLink" href="https://www.hioscar.com/">Oscar Health</a>, <a class="nasa workLink" href="https://www.goldmansachs.com/">GS</a>, <a class="celo workLink" href="https://celo.org">Celo</a>, <a class="tinder workLink" href="https://tinder.com">Tinder</a>,
        <a class="snapchat workLink" href="https://snapchat.com">Snapchat</a>, and <a class="nasa workLink" href="https://nasa.gov">NASA</a>.
      </p>
      <br>
      <p>
        <span class='ec ec-round-pushpin'></span> New York, NY
        <br>
        <span class="ec ec-telephone-receiver"></span><a class="underlined" href="https://cal.com/yasmeen-roumie/30min"> Let's chat! </a>
      </p>
      <br>
      <a href="http://bit.ly/yasmeen-github"><i class="github icon"></i></a>
      <a href="http://bit.ly/yasmeen-linkedin"><i class="linkedin icon"></i></a>
      <a href="mailto:yasmeen.roumie@gmail.com"><i class="mail icon"></i></a>
    </div>
    <div class="six wide column">
      <img src="/static/img/hey_bitmoji.png" style="visibility: visible; max-width: 100%; width:200px;">
    </div>
    <!-- END: SHARED HEADER -->
  `;

  // Create the navigation HTML
  const navHTML = `
    <!-- START: SHARED NAVIGATION -->
    <div class="sixteen wide column">
      <div class="ui stackable three item menu">
        <a class="item ${
          activePage === "index" ? "active" : ""
        }" href="/">Work</a>
        <a class="item ${
          activePage === "projects" ? "active" : ""
        }" href="/projects/">Projects</a>
        <a class="item ${
          activePage === "about" ? "active" : ""
        }" href="/about/">About</a>
      </div>
    </div>
    <!-- END: SHARED NAVIGATION -->
  `;

  // Create the footer HTML
  const footerHTML = `
    <!-- START: SHARED FOOTER -->
    <div class="sixteen wide column">
      <center>
        Made with <span class='ec ec-sparkling-heart '></span>
        <br>
        ⓒ <a href="https://github.com/yasmeen">YR</a> 2024
      </center>
    </div>
    <!-- END: SHARED FOOTER -->
  `;

  // Find the elements to replace
  const container = document.querySelector(".ui.main.text.container.grid");

  // Find the header placeholder
  const headerPlaceholder = document.getElementById(
    "shared-header-placeholder"
  );
  if (headerPlaceholder) {
    headerPlaceholder.outerHTML = headerHTML;
  }

  // Find the navigation placeholder
  const navPlaceholder = document.getElementById("shared-nav-placeholder");
  if (navPlaceholder) {
    navPlaceholder.outerHTML = navHTML;
  }

  // Find the footer placeholder
  const footerPlaceholder = document.getElementById(
    "shared-footer-placeholder"
  );
  if (footerPlaceholder) {
    footerPlaceholder.outerHTML = footerHTML;
  }
});
