import { LOOPS_PER_PAGE, Page, SamplePack } from "../parsers/samples_parser";

export async function generateSamplePack(IDs: number[]) {
  if (IDs?.length > 10) {
      console.log("pack length too long")
      return null;
  }
  console.log("received IDs:")
  console.log(IDs)

  // Create a full list of 10 IDs, filling empty slots with -1
  const fullIDs = Array(10).fill(-1);
  
  // Shift by one and move last to first
  if (IDs.length > 0) {
    IDs.forEach((id, index) => fullIDs[index] = id);
  }

  // rotate
  const lastElement = fullIDs.pop();
  fullIDs.unshift(lastElement);
  
  console.log("created IDs:")
  console.log(fullIDs)

  const device_name = "MONKEY"; // TODO: use DIS instead to get the ID of the device
  const pages: Page[] = [];

  // Create pages based on the full IDs list
  for (const id of fullIDs) {
      if (id === -1) {
          pages.push({
              id: 0xFFFF,
              loops: new Array(LOOPS_PER_PAGE).fill(null)
          });
      } else {
          try {
              const response = await fetch(`/samples/${device_name}/DRM/${id}.json`);
              const pageData = await response.json();
              pages.push(pageData);
          } catch (e) {
              console.error(`Failed to fetch page for ID ${id}:`, e);
              pages.push({
                  id: 0xFFFF,
                  loops: new Array(LOOPS_PER_PAGE).fill(null)
              });
          }
      }
  }

  // Create the SamplePack
  const samplePack: SamplePack = {
      reserved0: 0xFFFFFFFF,
      reserved1: 0xFFFFFFFF,
      reserved2: 0xFFFFFFFF,
      reserved3: 0xFFFFFFFF,
      pages: pages,
  };

  return samplePack;
}