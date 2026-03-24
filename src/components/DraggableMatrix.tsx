import { useCallback, useRef, useState } from "react";
import { View, Text, Platform } from "react-native";
import {
  Gesture,
  GestureDetector,
  Pressable as GHPressable,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  Task,
  Quadrant,
  QUADRANTS,
  getQuadrant,
  quadrantToProperties,
} from "../types/task";

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DraggableMatrixProps {
  getTasksByQuadrant: (q: Quadrant) => Task[];
  filterByProject: (list: Task[]) => Task[];
  toggleTask: (id: string) => void;
  updateTask: (
    id: string,
    updates: Partial<Pick<Task, "urgency" | "importance">>
  ) => void;
  onViewQuadrant: (q: Quadrant) => void;
  onDragStateChange: (dragging: boolean) => void;
}

export function DraggableMatrix({
  getTasksByQuadrant,
  filterByProject,
  toggleTask,
  updateTask,
  onViewQuadrant,
  onDragStateChange,
}: DraggableMatrixProps) {
  const quadrantLayouts = useRef<Record<number, LayoutRect>>({});
  const containerOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [draggedTaskData, setDraggedTaskData] = useState<Task | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(0);
  const dragOpacity = useSharedValue(0);
  const activeDropZone = useSharedValue<number>(0);
  const containerScreenX = useSharedValue(0);
  const containerScreenY = useSharedValue(0);

  const ghostStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: dragY.value - containerScreenY.value - 24,
    left: dragX.value - containerScreenX.value - 90,
    width: 180,
    opacity: dragOpacity.value,
    transform: [{ scale: dragScale.value }],
    zIndex: 1000,
  }));

  const startDrag = useCallback(
    (task: Task) => {
      setDraggedTaskData(task);
      onDragStateChange(true);
    },
    [onDragStateChange]
  );

  const endDrag = useCallback(
    (targetQuadrant: number | null) => {
      if (
        draggedTaskData &&
        targetQuadrant &&
        targetQuadrant >= 1 &&
        targetQuadrant <= 4
      ) {
        const currentQ = getQuadrant(draggedTaskData);
        if (currentQ !== targetQuadrant) {
          const props = quadrantToProperties(targetQuadrant as Quadrant);
          updateTask(draggedTaskData.id, props);
        }
      }
      setDraggedTaskData(null);
      onDragStateChange(false);
    },
    [draggedTaskData, updateTask, onDragStateChange]
  );

  const findQuadrant = useCallback(
    (absX: number, absY: number): number | null => {
      const layouts = quadrantLayouts.current;
      for (const key of [1, 2, 3, 4]) {
        const rect = layouts[key];
        if (!rect) continue;
        if (
          absX >= rect.x &&
          absX <= rect.x + rect.width &&
          absY >= rect.y &&
          absY <= rect.y + rect.height
        ) {
          return key;
        }
      }
      return null;
    },
    []
  );

  // Store absolute screen coordinates via measureInWindow
  const quadrantRefs = useRef<Record<number, View | null>>({});
  const measureQuadrant = useCallback(
    (q: Quadrant) => {
      const ref = quadrantRefs.current[q];
      if (ref) {
        ref.measureInWindow((x, y, width, height) => {
          quadrantLayouts.current[q] = { x, y, width, height };
        });
      }
    },
    []
  );
  const setQuadrantRef = useCallback(
    (q: Quadrant, ref: View | null) => {
      quadrantRefs.current[q] = ref;
    },
    []
  );

  const containerRef = useRef<View>(null);

  const remeasureContainer = useCallback(() => {
    containerRef.current?.measureInWindow((x, y) => {
      containerOffset.current = { x, y };
      containerScreenX.value = x;
      containerScreenY.value = y;
    });
  }, [containerScreenX, containerScreenY]);

  const quadrantProps = (q: Quadrant) => ({
    quadrant: q,
    tasks: filterByProject(getTasksByQuadrant(q)),
    toggleTask,
    onViewAll: () => onViewQuadrant(q),
    onMeasure: measureQuadrant,
    setRef: setQuadrantRef,
    activeDropZone,
    draggedTaskId: draggedTaskData?.id ?? null,
    dragX,
    dragY,
    dragScale,
    dragOpacity,
    startDrag,
    endDrag,
    findQuadrant,
  });

  return (
    <View className="px-4 pt-4" ref={containerRef} onLayout={remeasureContainer}>
      {/* ── Axis header ── */}
      <View className="flex-row mb-2">
        <View className="flex-1 items-center">
          <View className="flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-urgent" />
            <Text className="font-body text-[10px] font-bold text-urgent tracking-[1.5px] uppercase">
              Urgent
            </Text>
          </View>
        </View>
        <View className="flex-1 items-center">
          <Text className="font-body text-[10px] font-bold text-meta tracking-[1.5px] uppercase">
            Not Urgent
          </Text>
        </View>
      </View>

      {/* ── Row 1: Important ── */}
      <View className="flex-row items-center mb-1.5">
        <View className="bg-slate/20 rounded-full px-2 py-0.5 mr-2">
          <Text className="font-body text-[8px] font-bold text-slate tracking-[1px] uppercase">
            Important
          </Text>
        </View>
        <View className="flex-1 h-px bg-border" />
      </View>
      <View className="flex-row gap-2.5 mb-4">
        <DroppableQuadrant {...quadrantProps(1)} />
        <DroppableQuadrant {...quadrantProps(2)} />
      </View>

      {/* ── Row 2: Not Important ── */}
      <View className="flex-row items-center mb-1.5">
        <View className="bg-meta/15 rounded-full px-2 py-0.5 mr-2">
          <Text className="font-body text-[8px] font-bold text-meta tracking-[1px] uppercase">
            Less Important
          </Text>
        </View>
        <View className="flex-1 h-px bg-border" />
      </View>
      <View className="flex-row gap-2.5">
        <DroppableQuadrant {...quadrantProps(3)} />
        <DroppableQuadrant {...quadrantProps(4)} />
      </View>

      {/* ── Drag ghost ── */}
      {draggedTaskData && (
        <Animated.View style={ghostStyle} pointerEvents="none">
          <View
            className="bg-bg-card rounded-xl p-4 border border-slate/40"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 12,
            }}
          >
            <Text
              className="font-body text-sm font-bold text-heading"
              numberOfLines={2}
            >
              {draggedTaskData.title}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/* ── Droppable Quadrant Cell ── */

const QUADRANT_ACCENT: Record<number, string> = {
  1: "#ac0b18",
  2: "#0051d5",
  3: "#874200",
  4: "#737686",
};

interface DroppableQuadrantProps {
  quadrant: Quadrant;
  tasks: Task[];
  toggleTask: (id: string) => void;
  onViewAll: () => void;
  onMeasure: (q: Quadrant) => void;
  setRef: (q: Quadrant, ref: View | null) => void;
  activeDropZone: Animated.SharedValue<number>;
  draggedTaskId: string | null;
  dragX: Animated.SharedValue<number>;
  dragY: Animated.SharedValue<number>;
  dragScale: Animated.SharedValue<number>;
  dragOpacity: Animated.SharedValue<number>;
  startDrag: (task: Task) => void;
  endDrag: (targetQ: number | null) => void;
  findQuadrant: (absX: number, absY: number) => number | null;
}

function DroppableQuadrant({
  quadrant,
  tasks,
  toggleTask,
  onViewAll,
  onMeasure,
  setRef,
  activeDropZone,
  draggedTaskId,
  dragX,
  dragY,
  dragScale,
  dragOpacity,
  startDrag,
  endDrag,
  findQuadrant,
}: DroppableQuadrantProps) {
  const info = QUADRANTS[quadrant];
  const active = tasks.filter((t) => t.status === "active");
  const completed = tasks.filter((t) => t.status === "completed");
  const MAX_VISIBLE = 4;
  const accent = QUADRANT_ACCENT[quadrant];

  const highlightStyle = useAnimatedStyle(() => ({
    borderWidth: activeDropZone.value === quadrant ? 2 : 1,
    borderColor:
      activeDropZone.value === quadrant
        ? "rgba(100,160,255,0.7)"
        : "rgba(150,150,150,0.2)",
    borderRadius: 16,
  }));

  return (
    <Animated.View
      className="flex-1"
      style={highlightStyle}
      ref={(ref: View | null) => setRef(quadrant, ref)}
      onLayout={() => onMeasure(quadrant)}
    >
      <GHPressable
        style={{ flex: 1, borderRadius: 16, overflow: "hidden", minHeight: 190 }}
        className="bg-bg-card"
        onPress={onViewAll}
      >
        {/* Color accent bar */}
        <View style={{ height: 4, backgroundColor: accent }} />

        <View style={{ padding: 14, flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-display text-sm font-bold text-heading">
              {info.title}
            </Text>
            <View
              style={{ backgroundColor: accent + "20" }}
              className="rounded-full px-2.5 py-1"
            >
              <Text
                style={{ color: accent }}
                className="font-body text-xs font-bold"
              >
                {active.length}
              </Text>
            </View>
          </View>

          {/* Task list */}
          {active.length === 0 ? (
            <View className="flex-1 justify-center items-center py-4">
              <Text className="font-body text-xs text-meta">No tasks</Text>
            </View>
          ) : (
            <View className="gap-3.5">
              {active.slice(0, MAX_VISIBLE).map((task) => (
                <DraggableTaskRow
                  key={task.id}
                  task={task}
                  isDraggedAway={draggedTaskId === task.id}
                  toggleTask={toggleTask}
                  dragX={dragX}
                  dragY={dragY}
                  dragScale={dragScale}
                  dragOpacity={dragOpacity}
                  activeDropZone={activeDropZone}
                  startDrag={startDrag}
                  endDrag={endDrag}
                  findQuadrant={findQuadrant}
                  accent={accent}
                />
              ))}
              {active.length > MAX_VISIBLE && (
                <Text className="font-body text-[11px] text-meta">
                  +{active.length - MAX_VISIBLE} more
                </Text>
              )}
            </View>
          )}

          {/* Completed count */}
          {completed.length > 0 && (
            <View className="mt-auto pt-3 border-t border-border mt-3">
              <Text className="font-body text-[11px] text-meta">
                {completed.length} completed
              </Text>
            </View>
          )}
        </View>
      </GHPressable>
    </Animated.View>
  );
}

/* ── Draggable Task Row ── */

interface DraggableTaskRowProps {
  task: Task;
  isDraggedAway: boolean;
  toggleTask: (id: string) => void;
  dragX: Animated.SharedValue<number>;
  dragY: Animated.SharedValue<number>;
  dragScale: Animated.SharedValue<number>;
  dragOpacity: Animated.SharedValue<number>;
  activeDropZone: Animated.SharedValue<number>;
  startDrag: (task: Task) => void;
  endDrag: (targetQ: number | null) => void;
  findQuadrant: (absX: number, absY: number) => number | null;
  accent: string;
}

function DraggableTaskRow({
  task,
  isDraggedAway,
  toggleTask,
  dragX,
  dragY,
  dragScale,
  dragOpacity,
  activeDropZone,
  startDrag,
  endDrag,
  findQuadrant,
  accent,
}: DraggableTaskRowProps) {
  const isActive = useSharedValue(false);

  const updateDropZone = useCallback(
    (absX: number, absY: number) => {
      const target = findQuadrant(absX, absY);
      activeDropZone.value = target ?? 0;
    },
    [findQuadrant, activeDropZone]
  );

  const handleEnd = useCallback(
    (absX: number, absY: number) => {
      const target = findQuadrant(absX, absY);
      endDrag(target);
    },
    [findQuadrant, endDrag]
  );

  const handleToggle = useCallback(() => {
    toggleTask(task.id);
  }, [toggleTask, task.id]);

  const handleStartDrag = useCallback(
    (t: Task) => {
      startDrag(t);
    },
    [startDrag]
  );

  const tap = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(handleToggle)();
  });

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart((e) => {
      "worklet";
      isActive.value = true;
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      dragScale.value = withSpring(1.05);
      dragOpacity.value = withTiming(1, { duration: 150 });
      runOnJS(handleStartDrag)(task);
    });

  const pan = Gesture.Pan()
    .activateAfterLongPress(400)
    .onUpdate((e) => {
      "worklet";
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      runOnJS(updateDropZone)(e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      "worklet";
      dragScale.value = withTiming(0.8, { duration: 150 });
      dragOpacity.value = withTiming(0, { duration: 150 });
      activeDropZone.value = 0;
      isActive.value = false;
      runOnJS(handleEnd)(e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      "worklet";
      if (isActive.value) {
        dragScale.value = withTiming(0.8, { duration: 150 });
        dragOpacity.value = withTiming(0, { duration: 150 });
        activeDropZone.value = 0;
        isActive.value = false;
        runOnJS(endDrag)(null);
      }
    });

  const gesture = Gesture.Race(Gesture.Simultaneous(longPress, pan), tap);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: isDraggedAway ? 0.3 : 1,
  }));

  if (Platform.OS === "web") {
    return (
      <GHPressable
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
        onPress={handleToggle}
      >
        <View
          style={{ borderColor: accent + "40" }}
          className="w-4.5 h-4.5 mt-0.5 rounded border items-center justify-center"
        />
        <Text
          className="font-body text-[13px] text-body flex-1 leading-[18px]"
          numberOfLines={2}
        >
          {task.title}
        </Text>
      </GHPressable>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          { flexDirection: "row", alignItems: "flex-start", gap: 8 },
          rowStyle,
        ]}
      >
        <View
          style={{ borderColor: accent + "50" }}
          className="w-4.5 h-4.5 mt-0.5 rounded border items-center justify-center"
        />
        <Text
          className="font-body text-[13px] text-body flex-1 leading-[18px]"
          numberOfLines={2}
        >
          {task.title}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}
