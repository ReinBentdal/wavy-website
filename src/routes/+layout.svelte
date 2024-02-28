<script lang="ts">
    import { page } from '$app/stores';
    import {pageStructureFormatted} from './pages';

    let pageStructure = pageStructureFormatted()
</script>
  
<header>
  <nav>
    <table>
      <tr>
        <th>
          <a class="logo { $page.url.pathname === '/' ? 'current-page' : '' }" href="/" rel="noopener noreferrer">Wavy Industries</a>
        </th>
        {#each pageStructure.pages as parentPage}
          <th>
            <a href="{parentPage.path}" class="{ $page.url.pathname === parentPage.path ? 'current-page' : '' }">{parentPage.name}</a>
          </th>
        {/each}
      </tr>
      {#each pageStructure.subpages as subPageRow}
        <tr>
          <td></td>
          {#each subPageRow as subPage}
            <td>
              {#if subPage}
                <a href="{subPage.path}" class="{ $page.url.pathname === subPage.path ? 'current-page' : '' }">{subPage.name}</a>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </table>
  </nav>
</header>

<slot></slot> <!-- This is where your page content will be injected -->

<footer>
  <nav>
      <span>© 2024 Wavy Industries</span>
      <span>Lillehammer, Norway</span>
  </nav>
</footer>

<style>
  header {
      padding: 1rem 0;
      margin-bottom: 2rem;
  }

  .logo {
    font-size: 1.5rem;
    opacity: 1;
  }

  .current-page {
    opacity: 1;
    text-decoration: underline;
  }

  nav tr * {
    text-align: start;
    vertical-align: bottom;
    text-decoration: none;
    padding: 0 1rem;
  }

  nav th {
    font-weight: normal;
    padding-bottom: 0.5rem;
  }

  nav a {
    opacity: 0.7;
  }

  nav a:visited {
    color: inherit;
  }

  nav td {
    font-size: 0.8rem;
  }

  footer {
      display: flex;
      justify-content: left;
      padding: 1rem 0;
      margin-top: 2rem;
  }
</style>