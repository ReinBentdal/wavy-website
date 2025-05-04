<script lang="ts">
    import { bluetoothState } from '~/stores/Bluetooth.svelte';
  </script>
  
  <div class="status-circle" class:connected={bluetoothState.connectionState === 'connected'} class:connection-loss={bluetoothState.connectionState === 'connectionLoss'}>
  </div>
  
  <style>
    .status-circle {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #EA5124; /* red when disconnected */
      transition: background-color 0.3s ease;
    }
  
    .connected {
      background-color: #45C367; /* green when connected */
    }
  
    .connection-loss {
      background-color: #E89209; /* yellow when connection lost */
    }
  </style>