/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const PageExecutionTimings = require('../../audits/mainthread-work-breakdown.js');
const Runner = require('../../runner.js');
const assert = require('assert');
const options = PageExecutionTimings.defaultOptions;

const acceptableTrace = require('../fixtures/traces/progressive-app-m60.json');
const siteWithRedirectTrace = require('../fixtures/traces/site-with-redirect.json');
const loadTrace = require('../fixtures/traces/load.json');
const errorTrace = require('../fixtures/traces/airhorner_no_fcp.json');

const acceptableTraceExpectations = {
  parseHTML: 14,
  styleLayout: 338,
  paintCompositeRender: 58,
  scriptEvaluation: 215,
  scriptParseCompile: 25,
  garbageCollection: 48,
  other: 663,
};
const siteWithRedirectTraceExpectations = {
  parseHTML: 84,
  styleLayout: 281,
  paintCompositeRender: 6,
  scriptEvaluation: 145,
  scriptParseCompile: 38,
  garbageCollection: 46,
  other: 184,
};
const loadTraceExpectations = {
  parseHTML: 25,
  styleLayout: 150,
  paintCompositeRender: 24,
  scriptEvaluation: 347,
  garbageCollection: 3,
  other: 382,
};

describe('Performance: page execution timings audit', () => {
  function keyOutput(output) {
    const keyedOutput = {};
    for (const item of output.details.items) {
      keyedOutput[item.group] = Math.round(item.duration);
    }
    return keyedOutput;
  }

  it('should compute the correct pageExecutionTiming values for the pwa trace', async () => {
    const artifacts = Object.assign(
      {traces: {defaultPass: acceptableTrace}},
      Runner.instantiateComputedArtifacts()
    );

    const output = await PageExecutionTimings.audit(artifacts, {options});
    assert.deepStrictEqual(keyOutput(output), acceptableTraceExpectations);
    assert.equal(Math.round(output.rawValue), 1360);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 0.98);
  });

  it('should compute the correct values when simulated', async () => {
    const artifacts = Object.assign(
      {traces: {defaultPass: acceptableTrace}},
      Runner.instantiateComputedArtifacts()
    );

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 3}};
    const output = await PageExecutionTimings.audit(artifacts, {options, settings});

    const keyedOutput = keyOutput(output);
    for (const key of Object.keys(acceptableTraceExpectations)) {
      const actual = keyedOutput[key];
      const expected = acceptableTraceExpectations[key] * 3;
      assert.ok(Math.abs(actual - expected) <= 2, `expected ${expected} got ${actual}`);
    }

    assert.equal(Math.round(output.rawValue), 4081);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 0.49);
  });

  it('should compute the correct values for the redirect trace', async () => {
    const artifacts = Object.assign(
      {traces: {defaultPass: siteWithRedirectTrace}},
      Runner.instantiateComputedArtifacts()
    );

    const output = await PageExecutionTimings.audit(artifacts, {options});
    assert.deepStrictEqual(keyOutput(output), siteWithRedirectTraceExpectations);
    assert.equal(Math.round(output.rawValue), 784);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 1);
  });

  it('should compute the correct values for the load trace', async () => {
    const artifacts = Object.assign(
      {traces: {defaultPass: {traceEvents: loadTrace}}},
      Runner.instantiateComputedArtifacts()
    );

    const output = await PageExecutionTimings.audit(artifacts, {options});
    assert.deepStrictEqual(keyOutput(output), loadTraceExpectations);
    assert.equal(Math.round(output.rawValue), 933);
    assert.equal(output.details.items.length, 6);
    assert.equal(output.score, 1);
  });

  it('should get no data when no events are present', () => {
    const artifacts = Object.assign(
      {traces: {defaultPass: errorTrace}},
      Runner.instantiateComputedArtifacts()
    );

    return PageExecutionTimings.audit(artifacts, {options}).then(output => {
      assert.equal(output.details.items.length, 0);
      assert.equal(output.score, 1);
      assert.equal(Math.round(output.rawValue), 0);
    });
  });
});
