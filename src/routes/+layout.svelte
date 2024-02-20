<script lang="ts">
    import { page } from '$app/stores';
</script>

<style>
    header {
        display: flex;
        justify-content: space-between;
        padding: 1rem 0;
        margin-bottom: 2rem;
    }
  
    nav {
        display: flex;
        justify-content: flex-start;
        align-items: center;
    }

    nav > * {
      color: #636363;
      text-decoration: none;
      margin-right: 4rem;
    }

    nav a:hover {
      color: #000;
    }

    .logo {
      font-size: 1.5rem;
      color: black;
    }

    .active {
        text-decoration: underline;
    }

    footer {
        display: flex;
        justify-content: left;
        padding: 1rem 0;
        margin-top: 2rem;
    }
</style>
  
  <header>
    <nav >
        <a class="logo {$page.url.pathname === '/' ? 'active' : ''}" href="/" rel="noopener noreferrer">Wavy Industries</a>
        <a href="/monkey" class={$page.url.pathname === '/monkey' ? 'active' : ''}>Monkey</a>
        <a href="/midi-connect-mac" class={$page.url.pathname === '/midi-connect-mac' ? 'active' : ''}>MIDI Connect for macOS</a>
        <a href="/about" class={$page.url.pathname === '/about' ? 'active' : ''}>About</a>
    </nav>
    <div></div>
  </header>
  
  <slot></slot> <!-- This is where your page content will be injected -->
  
  <footer>
    <nav>
        <span>© 2024 Wavy Industries</span>
        <span>Lillehammer, Norway</span>
    </nav>
  </footer>