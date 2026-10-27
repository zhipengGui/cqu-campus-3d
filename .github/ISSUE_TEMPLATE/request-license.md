name: 申请使用授权 / License Request
description: 想复用本项目的代码或模型？请填写此模板联系作者
labels: ["license-request"]
body:
  - type: markdown
    attributes:
      value: |
        感谢你对本项目的关注！本项目代码与模型版权归作者所有（保留所有权利），**未经授权请勿复制、修改或再发布**（包括完整或部分）。
        如需使用，请填写以下信息，作者会尽快回复。/ Thanks for your interest! This project is all rights reserved — please fill in the form below to request permission.

  - type: textarea
    id: purpose
    attributes:
      label: 用途 / Purpose
      description: 你打算如何使用？（课程作业、研究、二次开发、商用等）
      placeholder: 例：毕业设计参考实现，会在论文中注明出处
    validations:
      required: true

  - type: textarea
    id: scope
    attributes:
      label: 使用范围 / Scope
      description: 想使用哪部分？（全部代码 / 某些模块 / 3D 模型 / 数据）
      placeholder: 例：仅 src/vegetation.ts 的植被生成思路与实现
    validations:
      required: true

  - type: input
    id: contact
    attributes:
      label: 联系方式 / Contact（可选）
      description: 如需私下沟通可留下邮箱
      placeholder: example@mail.com
