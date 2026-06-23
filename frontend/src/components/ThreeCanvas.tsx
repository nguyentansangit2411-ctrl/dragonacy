"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/store/useStore";

interface NodeProps {
  position: [number, number, number];
  label: string;
  sublabel: string;
  color: string;
  glowColor: string;
  isActive: boolean;
  onClick: () => void;
}

function PipelineNode({ position, label, sublabel, color, glowColor, isActive, onClick }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 1.5 + position[0]) * 0.1;
      
      // Rotate slowly
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
      
      // Handle scaling on hover
      const targetScale = hovered ? 1.25 : (isActive ? 1.1 : 0.95);
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial
          color={hovered ? glowColor : color}
          emissive={hovered || isActive ? glowColor : "#000000"}
          emissiveIntensity={hovered ? 1.5 : (isActive ? 0.8 : 0.1)}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      
      {/* Label and Details */}
      <Text
        position={[0, 0.9, 0]}
        fontSize={0.22}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font="/fonts/GeistMono-Medium.woff" // fallback to standard
      >
        {label}
      </Text>
      <Text
        position={[0, 0.65, 0]}
        fontSize={0.14}
        color={isActive ? "#a855f7" : "#71717a"}
        anchorX="center"
        anchorY="middle"
      >
        {sublabel}
      </Text>
    </group>
  );
}

// Particle flowing between nodes
interface ParticleProps {
  start: [number, number, number];
  end: [number, number, number];
  speed?: number;
  color: string;
}

function FlowingParticle({ start, end, speed = 1.0, color }: ParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  useFrame((state, delta) => {
    if (meshRef.current) {
      progressRef.current += delta * speed;
      if (progressRef.current > 1) {
        progressRef.current = 0;
      }
      const t = progressRef.current;
      meshRef.current.position.set(
        THREE.MathUtils.lerp(start[0], end[0], t),
        THREE.MathUtils.lerp(start[1], end[1], t) + Math.sin(t * Math.PI) * 0.4, // arched path
        THREE.MathUtils.lerp(start[2], end[2], t)
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
      />
    </mesh>
  );
}

export default function ThreeCanvas() {
  const [mounted, setMounted] = useState(false);
  const queue = useStore((state) => state.queue);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[350px] bg-zinc-950/40 rounded-xl border border-zinc-800 flex items-center justify-center">
        <p className="text-zinc-500 animate-pulse text-sm">Đang khởi tạo công cụ trực quan...</p>
      </div>
    );
  }

  // Node Positions
  const posProducts: [number, number, number] = [-3.5, 0, 0];
  const posGemini: [number, number, number] = [-1.2, 0.8, 0];
  const posFacebook: [number, number, number] = [1.2, 0.8, 0];
  const posComment: [number, number, number] = [3.5, 0, 0];

  // Active status count for animation
  const generatingCount = queue.filter(q => q.status === "GENERATING").length;
  const readyCount = queue.filter(q => q.status === "READY").length;
  const publishedCount = queue.filter(q => q.status === "PUBLISHED").length;

  return (
    <div className="relative w-full h-[350px] bg-zinc-950/40 backdrop-blur-md rounded-xl border border-zinc-800/80 overflow-hidden shadow-inner">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Luồng xử lý</h3>
        <p className="text-[10px] text-zinc-600">Kéo để xoay • Cuộn để phóng to</p>
      </div>

      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-10 p-3 bg-zinc-950/90 border border-zinc-800 rounded-lg max-w-[240px] text-xs shadow-xl animate-fade-in">
          <p className="font-semibold text-purple-400 mb-1">{selectedNode}</p>
          {selectedNode === "Danh mục sản phẩm" && (
            <p className="text-zinc-400">Lưu trữ sản phẩm được nhập. Cung cấp dữ liệu đầu vào để tạo văn bản và hình ảnh.</p>
          )}
          {selectedNode === "Trình viết Gemini" && (
            <p className="text-zinc-400">Tự động tạo nội dung quảng cáo với các hashtag phù hợp dựa trên chi tiết sản phẩm.</p>
          )}
          {selectedNode === "Trình đăng Facebook" && (
            <p className="text-zinc-400">Đăng trực tiếp nội dung và hình ảnh đã tạo lên các trang Facebook thông qua Graph API.</p>
          )}
          {selectedNode === "Trình bình luận liên kết" && (
            <p className="text-zinc-400">Thêm link liên kết dưới dạng bình luận 2 phút sau khi đăng để tối đa hóa lượt truy cập.</p>
          )}
          <button 
            onClick={() => setSelectedNode(null)} 
            className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            Xóa lựa chọn
          </button>
        </div>
      )}

      <Canvas camera={{ position: [0, 0.5, 5.5], fov: 50 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-5, 5, 5]} intensity={1} />
        
        {/* Grid and background ambient glow */}
        <gridHelper args={[12, 12, "#18181b", "#18181b"]} position={[0, -1, 0]} />

        {/* Pipeline Nodes */}
        <PipelineNode
          position={posProducts}
          label="Danh mục sản phẩm"
          sublabel="Đồng bộ cơ sở dữ liệu"
          color="#1e3a8a"
          glowColor="#3b82f6"
          isActive={true}
          onClick={() => setSelectedNode("Danh mục sản phẩm")}
        />

        <PipelineNode
          position={posGemini}
          label="Trình viết Gemini"
          sublabel={`${generatingCount} đang viết`}
          color="#581c87"
          glowColor="#c084fc"
          isActive={generatingCount > 0}
          onClick={() => setSelectedNode("Trình viết Gemini")}
        />

        <PipelineNode
          position={posFacebook}
          label="Trình đăng Facebook"
          sublabel={`${readyCount} đang đợi`}
          color="#1e1b4b"
          glowColor="#6366f1"
          isActive={readyCount > 0}
          onClick={() => setSelectedNode("Trình đăng Facebook")}
        />

        <PipelineNode
          position={posComment}
          label="Trình bình luận liên kết"
          sublabel="Đã đăng & liên kết"
          color="#065f46"
          glowColor="#10b981"
          isActive={publishedCount > 0}
          onClick={() => setSelectedNode("Trình bình luận liên kết")}
        />

        {/* Pipeline Paths (Connection Lines) */}
        <Line
          points={[posProducts, posGemini]}
          color="#4b5563"
          lineWidth={1.5}
        />
        <Line
          points={[posGemini, posFacebook]}
          color="#4b5563"
          lineWidth={1.5}
        />
        <Line
          points={[posFacebook, posComment]}
          color="#4b5563"
          lineWidth={1.5}
        />

        {/* Dynamic Particles Flowing */}
        {generatingCount > 0 && (
          <FlowingParticle start={posProducts} end={posGemini} speed={0.8} color="#c084fc" />
        )}
        {readyCount > 0 && (
          <FlowingParticle start={posGemini} end={posFacebook} speed={1.2} color="#6366f1" />
        )}
        {publishedCount > 0 && (
          <FlowingParticle start={posFacebook} end={posComment} speed={1.5} color="#10b981" />
        )}

        <OrbitControls 
          enableZoom={true} 
          maxDistance={8} 
          minDistance={3}
          enablePan={false}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
