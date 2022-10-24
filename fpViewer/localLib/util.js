export const aveDeg = d => d['edges'] / d['vertices'] * 2;
export const density = d => d['vertices'] === 1 ? 0 : aveDeg(d) / (d['vertices'] - 1);
export const curve = (val, factor) => 1 - Math.log(val * (1 - factor) + factor) / Math.log(factor);

export const spiralLine = (posList, xPos, yPos, sizeSacle) => d3.line().curve(d3.curveBasis)(posList.map(pos => [pos[0] * sizeSacle + xPos, pos[1] * sizeSacle + yPos]));


export function breakX(xList) {
  // xList.sort((x, y) => x - y)
  // console.log(xList);

  let sumX = 0;
  let brokenX = {};
  let revBrokenX = {}
  let prevPeel = 0;

  for (const peel of xList) {
    const tempX = 1 + Math.log10(1 + Math.log10(peel - prevPeel));
    // const tempX = Math.cbrt(peel - prevPeel);
    // const tempX = Math.sqrt(1 + Math.log10(peel - prevPeel));
    sumX += tempX
    brokenX[peel] = sumX;
    revBrokenX[sumX] = peel;
    prevPeel = peel;
  }
  // console.log(brokenX);
  return [sumX, brokenX, revBrokenX];
}

export function getSTNodeFromLink(link, idx2node) {
  return [typeof (link.source) === 'number' ? idx2node[link.source] : link.source, typeof (link.target) === 'number' ? idx2node[link.target] : link.target]
}

export function getSTIdxFromLink(link, idx2node) {
  return [typeof (link.source) === 'number' ? link.source : link.source.id, typeof (link.target) === 'number' ? link.target : link.target.id]
}

export function getNodeLevel(node, wf2level) {
  return wf2level[`${node.wave}-${node.frag}`];
}

export function markNode(idx2node, markCondition, markFunc, clearFunc) {
  if (clearFunc === null || clearFunc === undefined) {
    clearFunc = () => {};
  }
  for (const tempNode of Object.values(idx2node)) {
    // console.log(tempNode.id, nodeIdSet)
    if (markCondition(tempNode)) {
      markFunc(tempNode)
    } else {
      clearFunc(tempNode)
    }
  }
}

export function markLink(st2link, markCondition, markFunc, clearFunc) {
  if (clearFunc === null || clearFunc === undefined) {
    clearFunc = () => {};
  }
  for (const tempLink of Object.values(st2link)) {
    if (markCondition(tempLink)) {
      markFunc(tempLink);
    } else {
      clearFunc(tempLink);
    }
  }
}