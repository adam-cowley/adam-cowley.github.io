// sort by date
export const sortByDate = (array: any[]) => {
  const sortedArray = array.sort(
    (a:any, b:any) =>
      // @ts-ignore
      new Date(b.data.date && b.data.date) - new Date(a.data.date && a.data.date)
  );
  return sortedArray;
};

export const sortByDateAndPinned = (array: any[]): any[] => {
  return array.sort((a, b) => {
    // Compare pinned status
    if (a.data.pinned && !b.data.pinned) {
      return -1;
    }
    if (!a.data.pinned && b.data.pinned) {
      return 1;
    }

    return a.data.date > b.data.date ? -1 : 1;
  });
};


// sort product by weight
export const sortByWeight = (array: any[]) => {
  const withWeight = array.filter(
    (item: { data: { weight: any } }) => item.data.weight
  );
  const withoutWeight = array.filter(
    (item: { data: { weight: any } }) => !item.data.weight
  );
  const sortedWeightedArray = withWeight.sort(
    (a: { data: { weight: number } }, b: { data: { weight: number } }) =>
      a.data.weight - b.data.weight
  );
  const sortedArray = [...new Set([...sortedWeightedArray, ...withoutWeight])];
  return sortedArray;
};
