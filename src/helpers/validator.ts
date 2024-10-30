import { Octokit } from "@octokit/rest";
import { TransformDecodeCheckError, TransformDecodeError, Value, ValueError } from "@sinclair/typebox/value";
import { Context, Env, envSchema, envValidator, PermitGenerationSettings, permitGenerationSettingsSchema, permitGenerationSettingsValidator } from "../types";

export async function returnDataToKernel(
  context: Context,
  repoToken: string,
  stateId: string,
  output: object,
  eventType = "return-data-to-ubiquity-os-kernel"
) {
  const octokit = new Octokit({ auth: repoToken });
  const {
    payload: {
      repository: {
        name: repo,
        owner: { login: owner },
      },
    },
  } = context;
  return octokit.repos.createDispatchEvent({
    owner,
    repo,
    event_type: eventType,
    client_payload: {
      state_id: stateId,
      output: JSON.stringify(output),
    },
  });
}

export function validateAndDecodeSchemas(rawEnv: object, rawSettings: object) {
  const errors: ValueError[] = [];

  const env = Value.Default(envSchema, rawEnv) as Env;

  if (!envValidator.test(env)) {
    for (const error of envValidator.errors(env)) {
      console.error(error);
      errors.push(error);
    }
  }

  const settings = Value.Default(permitGenerationSettingsSchema, rawSettings) as PermitGenerationSettings;
  if (!permitGenerationSettingsValidator.test(settings)) {
    for (const error of permitGenerationSettingsValidator.errors(settings)) {
      console.error(error);
      errors.push(error);
    }
  }

  if (errors.length) {
    throw { errors };
  }

  try {
    const decodedSettings = Value.Decode(permitGenerationSettingsSchema, settings);
    const decodedEnv = Value.Decode(envSchema, rawEnv || {});
    return { decodedEnv, decodedSettings };
  } catch (e) {
    console.error("validateAndDecodeSchemas", e);
    if (e instanceof TransformDecodeCheckError || e instanceof TransformDecodeError) {
      throw { errors: [e.error] };
    }
    throw e;
  }
}
