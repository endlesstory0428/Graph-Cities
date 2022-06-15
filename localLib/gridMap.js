import { 
  aveDeg, density, curve,
} from './util.js';

export function getSpiral(spiralList) {
  // // scan spiral size
  let minCount = Infinity;
  let maxCount = 0;
  for (const spiralInfo of spiralList) {
    if (spiralInfo['count'] > maxCount) {
      maxCount = spiralInfo['count'];
    };
    if (spiralInfo['count'] < minCount) {
      minCount = spiralInfo['count'];
    };
    spiralInfo['aveDeg'] = aveDeg(spiralInfo);
  };
  console.log(minCount)
  console.log(spiralList)
  minCount = Math.log(minCount + 1);
  maxCount = Math.log(maxCount + 1);
  const angleFactor = 4 / (maxCount - minCount);
  // // scan spiral shape
  for (const spiralInfo of spiralList) {
    spiralInfo['radius'] = Math.log(spiralInfo['edges'] + 1)
    const angle = (Math.log1p(spiralInfo['count']) - minCount) * angleFactor + 2;
    const angleCount = angle * 16;
    const spiralR = spiralInfo['radius'] / angleCount;
    const posList = [];
    const aveDegAngle = (spiralInfo['aveDeg'] / spiralInfo['layer'] - 1) * Math.PI;
    const baseAngle = -angle * Math.PI + Math.PI / 2;
    for (let i = 1; i <= angleCount; i++) {
      posList.push([-spiralR * i * Math.cos((i * Math.PI / 16 + baseAngle)), -spiralR * i * Math.sin((i * Math.PI / 16 + baseAngle))]);
    };
    spiralInfo['pos'] = posList
  };
};

export function getArc(arcList) {
  for (const arcInfo of arcList) {
    arcInfo['aveDeg'] = aveDeg(arcInfo);
    arcInfo['radius'] = Math.log(arcInfo['edges'] + 1);
  };
};