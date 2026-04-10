import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const swaggerFile = path.join(process.cwd(), "swagger.yaml");
export const swaggerSpec = yaml.load(fs.readFileSync(swaggerFile, "utf8")) as object;
