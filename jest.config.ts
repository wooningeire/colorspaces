import type {Config} from "@jest/types";

export default <Config.InitialOptions>{
	preset: "ts-jest",
	setupFilesAfterEnv: ["./tests/setup.ts"],

/* 	globals: {
		"ts-jest": {
			tsconfig: "tsconfig.json",
		},
	}, */
};