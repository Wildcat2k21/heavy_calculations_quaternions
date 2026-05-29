use rotation_core::objp::parse_obj;
use std::fs;

fn main() {
    // Парсер obj модели в json для демонстрации вращения на примере модели
    match parse_obj("model.obj") {
        Ok(mesh) => {
            println!("Vertices: {}", mesh.vertices.len());
            println!("Edges: {}", mesh.edges.len());
            println!("Faces: {}", mesh.faces.len());

            let json = serde_json::to_string_pretty(&mesh)
                .expect("Failed to serialize mesh");

            fs::write("model.json", json)
                .expect("Failed to write JSON file");

            println!("Saved to public/model.json");
        }

        Err(err) => {
            println!("Error: {}", err);
        }
    }
}