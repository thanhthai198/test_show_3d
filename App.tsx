import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { loadAsync } from 'expo-three';

// 4 bức tường (không trần, không sàn)
const walls = [
  { position: [0, 0, -5], rotation: [0, 0, 0], size: [10, 5] }, // trước
  { position: [0, 0, 5], rotation: [0, Math.PI, 0], size: [10, 5] }, // sau
  { position: [-5, 0, 0], rotation: [0, Math.PI / 2, 0], size: [10, 5] }, // trái
  { position: [5, 0, 0], rotation: [0, -Math.PI / 2, 0], size: [10, 5] }, // phải
];

function Wall({ position, rotation, size }: any) {
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);

  React.useEffect(() => {
    (async () => {
      const tex = await loadAsync(
        'https://threejsfundamentals.org/threejs/resources/images/wall.jpg',
      );
      setTexture(tex as unknown as THREE.Texture);
    })();
  }, []);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        map={texture ?? undefined}
        side={THREE.DoubleSide}
        color={texture ? 'white' : 'gray'}
      />
    </mesh>
  );
}

// Camera controller (xoay + zoom)
function CameraController({
  rotationRef,
  zoomRef,
}: {
  rotationRef: React.MutableRefObject<{ x: number; y: number }>;
  zoomRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const { x, y } = rotationRef.current;
    const radius = zoomRef.current;

    const camX = Math.sin(y) * radius * Math.cos(x);
    const camY = Math.sin(x) * radius;
    const camZ = Math.cos(y) * radius * Math.cos(x);

    camera.position.set(camX, camY, camZ);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function App() {
  const rotationRef = useRef({
    x: Math.PI / 2.3, // ~78°: gần như thẳng xuống
    y: Math.PI / 4, // ~45°: chéo nhẹ để thấy 4 tường
  });
  const zoomRef = useRef(24);
  const lastGesture = useRef({ dx: 0, dy: 0, distance: 0 });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gesture) => {
        lastGesture.current.distance = 0;
        lastGesture.current.dx = gesture.dx;
        lastGesture.current.dy = gesture.dy;
      },
      onPanResponderMove: (evt, gesture) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          const [a, b] = touches;
          const dx = a.pageX - b.pageX;
          const dy = a.pageY - b.pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (lastGesture.current.distance) {
            const delta = dist - lastGesture.current.distance;
            zoomRef.current = Math.min(
              25,
              Math.max(3, zoomRef.current - delta * 0.02),
            );
          }
          lastGesture.current.distance = dist;
        } else {
          const dx = gesture.dx - lastGesture.current.dx;
          const dy = gesture.dy - lastGesture.current.dy;
          lastGesture.current.dx = gesture.dx;
          lastGesture.current.dy = gesture.dy;

          rotationRef.current.y += dx * 0.005;
          rotationRef.current.x += dy * 0.005;
          rotationRef.current.x = Math.max(
            -Math.PI / 2.1,
            Math.min(Math.PI / 2.1, rotationRef.current.x),
          );
        }
      },
      onPanResponderRelease: () => {
        lastGesture.current.distance = 0;
      },
    }),
  ).current;

  const { width, height } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      <Canvas
        style={{ width, height }}
        camera={{ fov: 75, near: 0.1, far: 100 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} />
        {walls.map((w, i) => (
          <Wall key={i} {...w} />
        ))}
        <CameraController rotationRef={rotationRef} zoomRef={zoomRef} />
      </Canvas>
      <View
        {...pan.panHandlers}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-only"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
