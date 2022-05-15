import type {Config} from "@jest/types";

// import {pathsToModuleNameMapper} from "ts-jest";
// import requireJson from "require-json5";
// const {compilerOptions} = requireJson("./tsconfig.json");

export default async () => {

	return <Config.InitialOptions>{
		preset: "ts-jest",
		globals: {
			"ts-jest": {
				tsconfig: "tsconfig.json",
				useESM: true,
			},
		},
	
		// setupFilesAfterEnv: ["./tests/setup.ts"]
	
		moduleNameMapper: {
			"@/(.*)": "<rootDir>/src/$1",
		},//pathsToModuleNameMapper(compilerOptions.paths),
	};
};