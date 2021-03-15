// vim: fdm=marker

const picks_canvas = document.getElementById("picks-canvas")
const point_list = document.getElementById("point-list")
const draw_button = document.getElementById("draw-button")
const point_list_button = document.getElementById("point-list-button")
const split_toggle_button = document.getElementById("split-toggle-button")
const inside_toggle_button = document.getElementById("inside-toggle-button")

const inner_count = document.getElementById("inner-count")
const boundary_count = document.getElementById("boundary-count")
const triangle_count = document.getElementById("triangle-count")
const area_count = document.getElementById("area-count")

const dim = 500
const points = 10 // number of points-1
const offset = 50

const state = {
	ctx: null,
	vertex: [],
	doDrawInside: false,
	doDrawSplit: false,
	drawMode: false,
}

//////////////////
// ENTRY POINTS //
//////////////////

function init() {
	state.ctx = picks_canvas.getContext("2d")
	drawGrid()
}

function updateListAndDraw() {
	readPointList()
	drawMain()
}

function toggleSplitView() {
	state.doDrawSplit = !state.doDrawSplit
	drawMain()
}

function toggleDrawInsideAndDraw() {
	state.doDrawInside = !state.doDrawInside
	drawMain()
}

function manualDraw() {
	buttons = [point_list_button, split_toggle_button, inside_toggle_button]
	if (state.drawMode) {
		state.drawMode = false
		point_list.value = convertToList(state.vertex)
		for (let i = 0; i < buttons.length; i++) {
			buttons[i].removeAttribute("disabled")
		}
		drawMain()
	} else {
		state.drawMode = true
		state.vertex = []
		for (let i = 0; i < buttons.length; i++) {
			buttons[i].setAttribute("disabled", "")
		}
	}
}

//////////////////////
// HELPER FUNCTIONS //
//////////////////////

// pixelMap converts logical coordinates to the pixel values of the
// point where it should drawn on the canvas
function pixelMap(p) {
	xx = offset + (dim / points) * p[0]
	yy = offset + (dim / points) * (points - p[1])
	return [xx, yy]
}

function convertToList(pointlist) {
	s = []
	for (let i = 0; i < pointlist.length; i++) {
		p = pointlist[i]
		x = p[0]
		y = p[1]
		s.push(x + "," + y)
	}
	return s.join("\n")
}

function readPointList() {
	state.vertex = []
	let l = point_list.value.split("\n")
	for (i in l) {
		let p = l[i].split(",")
		state.vertex.push([parseInt(p[0]), parseInt(p[1])])
	}
}

function isSamePoint(point1, point2) {
	return point1[0] === point2[0] && point1[1] === point2[1]
}

function isSameLine(line1, line2) {
	return (
		(isSamePoint(line1[0], line2[0]) && isSamePoint(line1[1], line2[1])) ||
		(isSamePoint(line1[1], line2[0]) && isSamePoint(line1[0], line2[1]))
	)
}

function hasCommonPoint(line1, line2) {
	return (
		isSamePoint(line1[0], line2[0]) ||
		isSamePoint(line1[0], line2[1]) ||
		isSamePoint(line1[1], line2[0]) ||
		isSamePoint(line1[1], line2[1])
	)
}

function isInside(x, y, poly) {
	var inside = false
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		var a = poly[i]
		var b = poly[j]
		var intersect =
			a[0] > x != b[0] > x &&
			y <= ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]) + a[1]
		if (intersect) inside = !inside
	}
	return inside
}

function isBoundary(x, y, poly) {
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		var a = poly[i]
		var b = poly[j]
		var collinear =
			a[0] > x != b[0] > x &&
			y == ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]) + a[1]
		var vertical = b[0] - a[0] == 0 && x == a[0] && a[1] > y != b[1] > y
		var endpoint = (a[0] == x && a[1] == y) || (b[0] == x && b[1] == y)
		if (collinear || vertical || endpoint) return true
	}
	return false
}

function isVertex(i, j, poly) {
	for (let k = 0; k < poly.length; k++) {
		if (poly[k][0] == i && poly[k][1] == j) return true
	}
	return false
}

function to2DArray(l) {
	var p = []
	for (let i = 0; i <= points; i++) {
		p.push([])
		for (let j = 0; j <= points; j++) {
			p[i].push(0)
		}
	}
	for (let i = 0; i < l.length; i++) {
		p[l[i][0]][l[i][1]] = 1
	}
	return p
}

function getSlope(line) {
	if (line[0][0] == line[1][0]) return Infinity
	return (line[0][1] - line[1][1]) / (line[0][0] - line[1][0])
}

function getPoints(poly) {
	const insidePointList = []
	const boundaryPointList = []
	for (let i = 0; i <= points; i++) {
		for (let j = 0; j <= points; j++) {
			const inside = isInside(i, j, poly)
			const boundary = isBoundary(i, j, poly)
			if (isVertex(i, j, poly)) continue
			if (boundary) {
				if (p.length == 0) return
				boundaryPointList.push([i, j])
			}
			if (inside && !boundary) {
				insidePointList.push([i, j])
			}
		}
	}
	return [insidePointList, boundaryPointList]
}

function isIntersect(line1, line2) {
	let slope1 = getSlope(line1)
	let slope2 = getSlope(line2)
	let yint1 = line1[0][1] - line1[0][0] * slope1
	let yint2 = line2[1][1] - line2[1][0] * slope2

	if (isSameLine(line1, line2)) return true

	if (slope1 === slope2) {
		if (yint1 !== yint2) return false
		if (slope1 === 0) {
			return (
				line1[0][0] < line2[0][0] === line2[0][0] < line1[1][0] ||
				line1[0][0] < line2[1][0] === line2[1][0] < line1[1][0]
			)
		}
		return (
			line1[0][1] < line2[0][1] === line2[0][1] < line1[1][1] ||
			line1[0][1] < line2[1][1] === line2[1][1] < line1[1][1]
		)
	}

	if (hasCommonPoint(line1, line2)) return false

	if ((slope1 === Infinity) ^ (slope2 === Infinity)) {
		if (slope2 === Infinity) {
			;[line1, line2] = [line2, line1]
			;[slope1, slope2] = [slope2, slope1]
			;[yint1, yint2] = [yint2, yint1]
		}
		const y = slope2 * line1[0][0] + yint2
		return (
			line2[0][0] < line1[0][0] == line1[0][0] < line2[1][0] &&
			line1[0][1] < y === y < line1[1][1]
		)
	}

	// different slopes = one intersection
	const intersectionX = (yint2 - yint1) / (slope1 - slope2)

	return (
		line1[0][0] < intersectionX === intersectionX < line1[1][0] &&
		line2[0][0] < intersectionX === intersectionX < line2[1][0]
	)
}

function isLineInPolygon(line, poly) {
	const midX = (line[0][0] + line[1][0]) / 2
	const midY = (line[0][1] + line[1][1]) / 2
	if (!isInside(midX, midY, poly)) return false
}

function splitPolygon(poly) {
	const lines = []
	const [inside, boundary] = getPoints(poly)
	const points = [...inside, ...boundary, ...poly]
	const points2D = to2DArray(points)

	for (let i = 0; i < poly.length; i++) {
		let next = (i + 1) % poly.length
		lines.push([poly[i], poly[next]])
	}

	function addLine(x1, y1, x2, y2) {
		if (isSamePoint([x1, y1], [x2, y2])) return
		if (!isInside((x1 + x2)/2, (y1 + y2) / 2, poly)) return
		if (!points2D[x1][y1]) return
		if (!points2D[x2][y2]) return
		let intersect = false
		for (let line of lines) {
			intersect = isIntersect(
				[
					[x1, y1],
					[x2, y2],
				],
				line
			)
			if (intersect) break
		}
		if (!intersect)
			lines.push([
				[x1, y1],
				[x2, y2],
			])
	}

	for (let x1 = 0; x1 < 10; x1++) {
		for (let y1 = 0; y1 < 10; y1++) {
			addLine(x1, y1, x1 + 1, y1)
			addLine(x1, y1, x1, y1 + 1)
		}
	}

	for (let x1 = 0; x1 <= 10; x1++) {
		for (let y1 = 0; y1 <= 10; y1++) {
			if (!points2D[x1][y1]) continue
			for (let x2 = 0; x2 <= 10; x2++) {
				for (let y2 = 0; y2 <= 10; y2++) addLine(x1, y1, x2, y2)
			}
		}
	}

	// return [[[1,2], [3,4]]]
	return lines
}

//////////////////////
// CANVAS FUNCTIONS //
//////////////////////

function clear() {
	state.ctx.clearRect(0, 0, dim + 2 * offset, dim + 2 * offset)
}

function drawGrid() {
	clear()
	pointList = []
	for (let i = 0; i <= points; i++) {
		for (let j = 0; j <= points; j++) {
			pointList.push([i, j])
		}
	}
	drawPoints(pointList, "#ddd", 3)
	drawPointText([0, 0], "bl")
	drawPointText([10, 0], "br")
	drawPointText([0, 10], "tl")
	drawPointText([10, 10], "tr")
}

function drawMain() {
	drawGrid()
	drawPoly(state.vertex, "#b8bb2620", "#b8bb26")
	if (state.doDrawSplit) {
		lines = splitPolygon(state.vertex)
		drawSegments(lines, "#989b1699")
	}
	drawPoints(state.vertex, "#789", 5)
	const [inside, boundary] = getPoints(state.vertex)
	if (state.doDrawInside) {
		drawInside()
	}

	const insideCount = inside.length
	const boundaryCount = boundary.length + state.vertex.length
	inner_count.innerText = insideCount
	boundary_count.innerText = boundaryCount
	triangle_count.innerText = insideCount * 2 + boundaryCount - 2
	area_count.innerText = insideCount + boundaryCount / 2 - 1
}

function drawPoly(poly, fill, stroke) {
	if (poly.length == 0) return
	state.ctx.fillStyle = fill
	state.ctx.strokeStyle = stroke
	state.ctx.lineWidth = 3
	state.ctx.beginPath()
	let p = pixelMap(poly[0])
	state.ctx.moveTo(p[0], p[1])
	for (let i = 1; i < state.vertex.length; i++) {
		let p = pixelMap(poly[i])
		state.ctx.lineTo(p[0], p[1])
	}
	state.ctx.closePath()
	state.ctx.fill()
	state.ctx.stroke()
}

function drawPoints(pointList, pointcolor, pointsize) {
	state.ctx.fillStyle = pointcolor
	for (let i = 0; i < pointList.length; i++) {
		state.ctx.beginPath()
		let p = pixelMap(pointList[i])
		state.ctx.arc(p[0], p[1], pointsize, 0, 2 * Math.PI)
		state.ctx.fill()
	}
}

function drawPointText(p, loc) {
	const pmap = pixelMap(p)
	const offset_map = {
		tl: [-5, -5],
		tr: [5, -5],
		bl: [-5, 5],
		br: [5, 5],
	}
	const align_map = {
		tl: ["bottom", "right"],
		tr: ["bottom", "left"],
		bl: ["top", "right"],
		br: ["top", "left"],
	}
	pmap[0] += offset_map[loc][0]
	pmap[1] += offset_map[loc][1]
	state.ctx.textBaseline = align_map[loc][0]
	state.ctx.textAlign = align_map[loc][1]
	state.ctx.fillStyle = "#999"
	state.ctx.font = "13px Arial"
	state.ctx.fillText("(" + p[0] + "," + p[1] + ")", pmap[0], pmap[1])
}

function drawInside() {
	const [inside, boundary] = getPoints(state.vertex)
	drawPoints(inside, "#fa673191", 5)
	drawPoints(boundary, "#45838891", 5)
}

function drawSegments(lines, color) {
	state.ctx.strokeStyle = color
	for (let i = 0; i < lines.length; i++) {
		const a = lines[i][0]
		const b = lines[i][1]
		const aa = pixelMap(a)
		const bb = pixelMap(b)
		state.ctx.beginPath()
		state.ctx.moveTo(aa[0], aa[1])
		state.ctx.lineTo(bb[0], bb[1])
		state.ctx.stroke()
	}
}

function drawManualDraw(e) {
	if (!state.drawMode) return
	let min_val = 1234567899
	let min_idx = [0, 0]
	const bb = picks_canvas.getBoundingClientRect()
	const mx = e.clientX - bb.left
	const my = e.clientY - bb.top
	for (let i = 0; i <= points; i++) {
		for (let j = 0; j <= points; j++) {
			p = pixelMap([i, j])
			ii = p[0] - mx
			jj = p[1] - my
			dist = ii * ii + jj * jj
			if (dist < min_val) {
				min_val = dist
				min_idx = [i, j]
			}
		}
	}
	drawGrid()
	drawPoly(state.vertex, "#b8bb2620", "#b8bb26")
	drawPoints(state.vertex, "#789", 5)
	drawPoints([min_idx], "#77889995", 7)
}

function drawModeAddPoint(e) {
	if (!state.drawMode) return
	let min_val = 1234567899
	let min_idx = [0, 0]
	const bb = picks_canvas.getBoundingClientRect()
	const mx = e.clientX - bb.left
	const my = e.clientY - bb.top
	for (let i = 0; i <= points; i++) {
		for (let j = 0; j <= points; j++) {
			p = pixelMap([i, j])
			ii = p[0] - mx
			jj = p[1] - my
			dist = ii * ii + jj * jj
			if (dist < min_val) {
				min_val = dist
				min_idx = [i, j]
			}
		}
	}
	state.vertex.push(min_idx)
}

draw_button.addEventListener("click", manualDraw)
point_list_button.addEventListener("click", updateListAndDraw)
split_toggle_button.addEventListener("click", toggleSplitView)
inside_toggle_button.addEventListener("click", toggleDrawInsideAndDraw)
picks_canvas.addEventListener("mousemove", drawManualDraw)
picks_canvas.addEventListener("mousedown", drawModeAddPoint)

init()
