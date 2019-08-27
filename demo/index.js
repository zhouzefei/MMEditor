import React, { Fragment, PureComponent } from "react";
import "./index.less";
import { MMEditor } from "../src/MMEditor";
import LeftBar from "./Content/LeftBar";
import RightBar from "./Content/RightBar";
import TopBar from "./Content/TopBar";
import { message } from "antd";
import RightMenu from "./Content/RightMenu";
import testdata from "./testdata";
class Editor extends PureComponent {
	state = {};
	// 编辑器实例
	editor = {};

	index = 0;

	checkNewLine = (data, editor) => {
		const {
			graph: {
				node: { nodes }
			}
		} = editor;
		const { fromPoint, toPoint, from, to } = data;
		// 通组件输入输出不能连接
		if (from === to) return false;
		// 输出不能连输出，输入不能连输入
		if (parseInt(toPoint, 10) === 1) {
			message.error("组件输出不能连接输出");
			return false;
		}
		// 检测组件输入不能连接输入
		if (nodes[from].data.component !== "read" && parseInt(fromPoint, 10) === 0) {
			message.error("组件输入不能连接输入");
			return false;
		}
		// 检测是否环图
		const fromIds = [];
		this.getFromIds(nodes[from], fromIds);
		if (fromIds.indexOf(to) > -1) {
			message.error("当前不支持构成环图！");
			return false;
		}
		return true;
	};

	// 获取所有父节点ID
	getFromIds(node, fromIds) {
		const {
			graph: {
				node: { nodes },
				line: { lines }
			}
		} = editor;
		node.fromLines.forEach(key => {
			const fromId = lines[key].data.from;
			fromIds.push(fromId);
			this.getFromIds(nodes[fromId], fromIds);
		});
	}

	// 销毁
	componentWillUnmount() {
		this.editor.destroy();
		this.editor = null;
	}

	// 初始化editor
	async componentDidMount() {
		this.editor = new MMEditor({ dom: this.editorRef });
		this.initEditorShape();
		this.editor.graph.line.shapes["default"].checkNewLine = this.checkNewLine;
		this.editor.schema.setInitData(testdata);
		this.addEditorEvent();
	}

	setData = data => {
		this.editor.schema.setData(this.parseData(data));
	};

	// 初始化编辑器事件
	addEditorEvent() {
		// 选中
		this.editor.graph.on("node:click", ({ node }) => {
			const fromLines = node.fromLines;
			const fromNodes = [];
			const nodes = this.editor.graph.node.nodes;
			const lines = this.editor.graph.line.lines;
			fromLines.forEach(lineId => {
				const line = lines[lineId];
				fromNodes.push(nodes[line.data.from].data);
			});
			this.rightbar.setState({
				activeNode: node.data,
				fromNodes
			});
			this.rightbar.setState({
				rightNodeId: null
			});
		});
		// 没有选中
		this.editor.graph.on("node:unactive", ({ node }) => {
			this.rightbar.setState({
				activeNode: {}
			});
			this.setState({
				rightNodeId: null
			});
		});

		// 其他右键
		this.editorRef.addEventListener("contextmenu", e => {
			e.preventDefault();
			this.setState({
				rightNodeId: null
			});
		});
		// 空白页点击
		this.editor.graph.on("paper:click", e => {
			this.setState({
				rightNodeId: null
			});
		});
		// 右键
		this.editor.graph.node.nodeG.node.addEventListener("contextmenu", e => {
			const path = e.path || (e.composedPath && e.composedPath());
			const node = path.find(each => each.getAttribute("class") === "mm-node");
			if (node) {
				e.stopPropagation();
				e.preventDefault();
				this.setState({
					rightNodeId: node.getAttribute("data-id"),
					left: e.clientX || 0,
					top: e.clientY || 0
				});
			}
		});
		this.setState({
			init: true
		});
	}

	// 注册其他初始化形状
	initEditorShape() {
		this.editor.graph.node.registeNode(
			"iconNodeInput",
			{
				linkPoints: [{ x: 0.5, y: 1 }]
			},
			"iconNode"
		);
		this.editor.graph.node.registeNode(
			"iconNodeOutput",
			{
				linkPoints: [{ x: 0.5, y: 0 }]
			},
			"iconNode"
		);
	}

	//生成新节点
	onDrop = (item, e) => {
		const dom = this.editor.dom.node;
		const name = item.name + `-${++this.index}`;
		const transform = this.editor.paper.transform();
		const info = transform.globalMatrix.split();
		if (e.clientX - dom.offsetLeft < 0 || e.clientY - dom.offsetTop < 0) return;
		const x = (e.clientX - dom.offsetLeft - info.dx) / info.scalex - 70 * info.scalex;
		const y = (e.clientY - dom.offsetTop - info.dy) / info.scalex - 15 * info.scalex;
		this.editor.graph.node.addNode(
			Object.assign({}, item, {
				iconPath: item.iconPath,
				type: item.type,
				config: {},
				output: [],
				name,
				x,
				y
			})
		);
	};

	render() {
		const { init, left, top, rightNodeId, fromNodes, activeNode, topbarRef } = this.state;
		return (
			<div
				className="job-editor"
				ref={ref => {
					this.ref = ref;
				}}
			>
				<LeftBar onDrop={this.onDrop} />
				<div className="job-content">
					<TopBar
						setData={this.setData}
						ref={ref => {
							this.setState({
								topbarRef: ref
							});
						}}
						parentRef={this.ref}
						editor={init && this.editor}
					/>
					<div
						onDragOver={this.onDragOver}
						onDrop={this.onDrop}
						className="job-mm-editor"
						ref={ref => {
							this.editorRef = ref;
						}}
					/>
				</div>
				{init && (
					<RightBar
						ref={ref => {
							this.rightbar = ref;
						}}
						editor={this.editor}
					/>
				)}
				{rightNodeId && this.editor && (
					<RightMenu
						left={left}
						top={top}
						topbar={topbarRef}
						rightNodeId={rightNodeId}
						editor={this.editor}
					/>
				)}
			</div>
		);
	}
}
export default Editor;
