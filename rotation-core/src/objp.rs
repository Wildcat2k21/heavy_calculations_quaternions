use std::collections::HashSet;
use std::fs;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Vertex {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Edge {
    pub a: usize,
    pub b: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mesh {
    pub vertices: Vec<Vertex>,
    pub edges: Vec<Edge>,
    pub faces: Vec<Vec<usize>>,
}

impl Mesh {
    pub fn new() -> Self {
        Self {
            vertices: Vec::new(),
            edges: Vec::new(),
            faces: Vec::new(),
        }
    }
}

pub fn parse_obj(path: &str) -> Result<Mesh, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read OBJ file: {}", e))?;

    let mut mesh = Mesh::new();
    let mut edge_set = HashSet::new();

    for line in content.lines() {
        let line = line.trim();

        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();

        match parts[0] {
            "v" => {
                if parts.len() < 4 {
                    continue;
                }

                let x = parts[1].parse::<f32>().unwrap_or(0.0);
                let y = parts[2].parse::<f32>().unwrap_or(0.0);
                let z = parts[3].parse::<f32>().unwrap_or(0.0);

                mesh.vertices.push(Vertex { x, y, z });
            }

            "f" => {
                if parts.len() < 4 {
                    continue;
                }

                let mut face = Vec::new();

                for part in &parts[1..] {
                    // Поддержка формата:
                    // f 1/2/3
                    // f 1//3
                    // f 1
                    let index_str = part.split('/').next().unwrap_or("");

                    if let Ok(index) = index_str.parse::<usize>() {
                        // OBJ -> 1-based index
                        face.push(index - 1);
                    }
                }

                if face.len() >= 3 {
                    // сохраняем грань
                    mesh.faces.push(face.clone());

                    // извлекаем уникальные edges
                    for i in 0..face.len() {
                        let a = face[i];
                        let b = face[(i + 1) % face.len()];

                        let edge = if a < b {
                            Edge { a, b }
                        } else {
                            Edge { a: b, b: a }
                        };

                        edge_set.insert(edge);
                    }
                }
            }

            _ => {}
        }
    }

    mesh.edges = edge_set.into_iter().collect();

    Ok(mesh)
}